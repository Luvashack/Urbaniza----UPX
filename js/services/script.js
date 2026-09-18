const SUPABASE_URL = "https://hpzhwmlhmfrezkptgimw.supabase.co";
const SUPABASE_KEY = "sb_publishable_YGYPrQvqmrNisbcEx6SGyA_iZi5nU3U";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const categoriaSelect = document.getElementById("categoria");
const avaliacaoForm = document.getElementById("avaliacaoForm");
const notaInput = document.getElementById("nota");
const comentarioInput = document.getElementById("comentario");
const midiasInput = document.getElementById("midias");
const midiasPreview = document.getElementById("midiasPreview");
const formStatus = document.getElementById("formStatus");
const btnLocalizacao = document.getElementById("btnLocalizacao");
const btnCentralizar = document.getElementById("btnCentralizar");
const localizacaoStatus = document.getElementById("localizacaoStatus");
const localEndereco = document.getElementById("localEndereco");
const localRegiao = document.getElementById("localRegiao");
const avaliacoesLista = document.getElementById("avaliacoesLista");
const btnEnviar = document.getElementById("btnEnviar");

let latitude = null;
let longitude = null;
let enderecoAtual = null;
let map;
let userMarker;
let accuracyCircle;
let markersLayer;

const MAX_ARQUIVOS = 5;
const MAX_TAMANHO_MB = 10;

if (midiasInput) {
    midiasInput.addEventListener("change", atualizarPreviewMidias);
}

document.addEventListener("DOMContentLoaded", async () => {
    configurarNotas();

    // Inicializa o mapa primeiro para que ele não dependa do Supabase.
    inicializarMapa();

    // Se o Supabase não carregar, o mapa continua funcionando.
    if (!window.supabase) {
        mostrarStatus(localizacaoStatus, "Mapa carregado. Serviço de avaliações indisponível.", true);
        avaliacoesLista.innerHTML = "<p>Não foi possível conectar ao serviço de avaliações.</p>";
        return;
    }

    await carregarCategorias();
    await carregarAvaliacoes();
    obterLocalizacao();
});

function configurarNotas() {
    const botoesNota = document.querySelectorAll(".nota-btn");

    botoesNota.forEach((botao) => {
        botao.addEventListener("click", () => {
            botoesNota.forEach((item) => item.classList.remove("selected"));
            botao.classList.add("selected");
            notaInput.value = botao.dataset.nota;
        });
    });
}

async function carregarCategorias() {
    const { data, error } = await db
        .from("categorias")
        .select("id, nome")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao carregar categorias:", error);
        categoriaSelect.innerHTML = '<option value="">Erro ao carregar categorias</option>';
        return;
    }

    categoriaSelect.innerHTML = '<option value="">Selecione uma categoria</option>';

    data.forEach((categoria) => {
        const option = document.createElement("option");
        option.value = categoria.id;
        option.textContent = categoria.nome;
        categoriaSelect.appendChild(option);
    });
}

function inicializarMapa() {
    const mapElement = document.getElementById("map");

    if (!window.L) {
        mapElement.innerHTML = `
            <div style="height:100%;display:grid;place-items:center;padding:20px;text-align:center;color:#68736e;">
                <div>
                    <strong>Não foi possível carregar o mapa.</strong>
                    <p style="margin:8px 0 0;">Verifique sua conexão com a internet e recarregue a página.</p>
                </div>
            </div>
        `;
        mostrarStatus(localizacaoStatus, "Biblioteca do mapa não foi carregada.", true);
        return;
    }

    map = L.map("map").setView([-23.5015, -47.4526], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    // Garante que o Leaflet calcule corretamente o tamanho do mapa.
    setTimeout(() => map.invalidateSize(), 100);
}

function obterLocalizacao() {
    if (!navigator.geolocation) {
        mostrarStatus(localizacaoStatus, "Seu navegador não suporta geolocalização.", true);
        localEndereco.textContent = "Localização indisponível";
        localRegiao.textContent = "Use um navegador com suporte a GPS.";
        return;
    }

    mostrarStatus(localizacaoStatus, "Obtendo sua localização...");

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            await aplicarLocalizacao(
                position.coords.latitude,
                position.coords.longitude,
                position.coords.accuracy
            );
        },
        (error) => {
            console.error("Erro de geolocalização:", error);
            mostrarStatus(
                localizacaoStatus,
                "Não foi possível obter sua localização. Permita o acesso ao GPS.",
                true
            );
            localEndereco.textContent = "Localização não identificada";
            localRegiao.textContent = "Clique em “Usar minha localização” para tentar novamente.";
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

async function aplicarLocalizacao(lat, lon, accuracy = null) {
    latitude = Number(lat);
    longitude = Number(lon);

    if (map) map.setView([latitude, longitude], 17);

    if (userMarker && map) map.removeLayer(userMarker);
    if (accuracyCircle && map) map.removeLayer(accuracyCircle);

    if (map && window.L) {
        userMarker = L.marker([latitude, longitude]).addTo(map);
        userMarker.bindPopup("<strong>Você está aqui</strong>").openPopup();

        if (accuracy && Number.isFinite(accuracy)) {
            accuracyCircle = L.circle([latitude, longitude], {
                radius: accuracy,
                weight: 1,
                fillOpacity: 0.08
            }).addTo(map);
        }
    }

    mostrarStatus(localizacaoStatus, "Localização encontrada. Identificando endereço...");

    try {
        // O GPS fornece as coordenadas e o reverse geocoding transforma
        // essas coordenadas em rua, bairro, cidade, estado e CEP.
        enderecoAtual = await obterEnderecoPorCoordenadas(latitude, longitude);

        localEndereco.textContent = formatarLinhaPrincipal(enderecoAtual);
        localRegiao.textContent = formatarLinhaLocalidade(enderecoAtual);

        mostrarStatus(
            localizacaoStatus,
            "Endereço identificado automaticamente. Você já pode fazer sua avaliação."
        );
    } catch (error) {
        console.error("Erro ao identificar endereço:", error);

        enderecoAtual = null;
        localEndereco.textContent = "Endereço não identificado";
        localRegiao.textContent = "Não foi possível obter o endereço desta localização.";
        mostrarStatus(
            localizacaoStatus,
            "GPS encontrado, mas não foi possível identificar o endereço.",
            true
        );
    }
}

async function obterEnderecoPorCoordenadas(lat, lon) {
    const chaveCache = `urbaniza-endereco:${lat.toFixed(5)}:${lon.toFixed(5)}`;
    const cache = sessionStorage.getItem(chaveCache);

    if (cache) {
        return JSON.parse(cache);
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", lat.toFixed(7));
    url.searchParams.set("lon", lon.toFixed(7));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("layer", "address");
    url.searchParams.set("accept-language", "pt-BR");

    const resposta = await fetch(url.toString(), {
        headers: {
            "Accept": "application/json"
        }
    });

    if (!resposta.ok) {
        throw new Error(`Serviço de endereço retornou HTTP ${resposta.status}.`);
    }

    const resultado = await resposta.json();
    const endereco = resultado?.address || {};

    const cidade = endereco.city || endereco.town || endereco.municipality;
    const estado = endereco.state;
    const pais = endereco.country_code;

    if (pais && pais.toLowerCase() !== "br") {
        throw new Error("A localização identificada não está no Brasil.");
    }

    if (cidade && normalizarTexto(cidade) !== "sorocaba") {
        throw new Error(`Localização identificada fora de Sorocaba: ${cidade}.`);
    }

    if (estado && !normalizarTexto(estado).includes("sao paulo")) {
        throw new Error(`Localização identificada fora de São Paulo: ${estado}.`);
    }

    const bairro =
        endereco.neighbourhood ||
        endereco.suburb ||
        endereco.quarter ||
        endereco.city_district ||
        endereco.residential ||
        endereco.hamlet ||
        "";

    const logradouro = endereco.road || endereco.pedestrian || endereco.footway || "";
    const numero = endereco.house_number || "";
    const cep = endereco.postcode || "";
    const cidadeFinal = cidade || "Sorocaba";
    const estadoFinal = estado || "São Paulo";

    if (!logradouro && !bairro) {
        throw new Error("O serviço de geocodificação não retornou rua ou bairro.");
    }

    const enderecoFormatado = [
        logradouro ? `${logradouro}${numero ? `, ${numero}` : ""}` : null,
        bairro || null,
        cidadeFinal,
        estadoFinal,
        cep || null
    ].filter(Boolean).join(" • ");

    const dados = {
        logradouro,
        numero,
        bairro,
        cidade: cidadeFinal,
        estado: estadoFinal,
        cep,
        endereco_formatado: enderecoFormatado
    };

    sessionStorage.setItem(chaveCache, JSON.stringify(dados));
    return dados;
}

function formatarLinhaPrincipal(endereco) {
    if (!endereco) return "Endereço não identificado";

    if (endereco.logradouro) {
        return `${endereco.logradouro}${endereco.numero ? `, ${endereco.numero}` : ""}`;
    }

    return endereco.bairro || "Endereço não identificado";
}

function formatarLinhaLocalidade(endereco) {
    if (!endereco) return "";

    const localidade = [endereco.bairro, endereco.cidade]
        .filter(Boolean)
        .join(", ");

    const estado = endereco.estado || "";
    const cep = endereco.cep ? ` • CEP ${endereco.cep}` : "";

    return [localidade, estado].filter(Boolean).join(" - ") + cep;
}

function normalizarTexto(valor) {
    return String(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

avaliacaoForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const categoriaId = categoriaSelect.value;
    const nota = notaInput.value;
    const comentario = comentarioInput.value.trim();

    if (latitude === null || longitude === null) {
        mostrarStatus(formStatus, "Primeiro, permita o acesso à sua localização.", true);
        return;
    }

    if (!enderecoAtual) {
        mostrarStatus(formStatus, "Primeiro, identifique sua localização para obter o endereço.", true);
        return;
    }

    if (!categoriaId || !nota) {
        mostrarStatus(formStatus, "Escolha uma categoria e uma nota.", true);
        return;
    }

    const arquivos = Array.from(midiasInput?.files || []);

    if (arquivos.length > MAX_ARQUIVOS) {
        mostrarStatus(formStatus, `Selecione no máximo ${MAX_ARQUIVOS} arquivos.`, true);
        return;
    }

    const arquivoInvalido = arquivos.find((arquivo) => {
        const tamanhoMB = arquivo.size / (1024 * 1024);
        const tipoValido = arquivo.type.startsWith("image/") || arquivo.type.startsWith("video/");
        return !tipoValido || tamanhoMB > MAX_TAMANHO_MB;
    });

    if (arquivoInvalido) {
        mostrarStatus(
            formStatus,
            `O arquivo "${arquivoInvalido.name}" é inválido. Use apenas fotos/vídeos de até ${MAX_TAMANHO_MB} MB.`,
            true
        );
        return;
    }

    btnEnviar.disabled = true;
    mostrarStatus(formStatus, "Enviando avaliação...");

    const { data: avaliacao, error: avaliacaoError } = await db
        .from("avaliacoes")
        .insert([{
            categoria_id: Number(categoriaId),
            nota: Number(nota),
            comentario: comentario || null,
            logradouro: enderecoAtual.logradouro || null,
            numero: enderecoAtual.numero || null,
            bairro: enderecoAtual.bairro || null,
            cidade: enderecoAtual.cidade || null,
            estado: enderecoAtual.estado || null,
            cep: enderecoAtual.cep || null,
            endereco_formatado: enderecoAtual.endereco_formatado || null,
            localizacao: `SRID=4326;POINT(${longitude} ${latitude})`
        }])
        .select("id")
        .single();

    if (avaliacaoError) {
        btnEnviar.disabled = false;
        console.error("Erro ao enviar avaliação:", avaliacaoError);
        mostrarStatus(formStatus, "Não foi possível enviar a avaliação: " + avaliacaoError.message, true);
        return;
    }

    const midiasSalvas = [];

    for (const arquivo of arquivos) {
        const extensao = arquivo.name.includes(".")
            ? arquivo.name.split(".").pop().toLowerCase()
            : "bin";
        const pasta = arquivo.type.startsWith("video/") ? "videos" : "fotos";
        const nomeSeguro = `${Date.now()}-${crypto.randomUUID()}.${extensao}`;
        const caminho = `${pasta}/${avaliacao.id}/${nomeSeguro}`;

        const { error: uploadError } = await db.storage
            .from("avaliacoes")
            .upload(caminho, arquivo, {
                cacheControl: "3600",
                upsert: false,
                contentType: arquivo.type
            });

        if (uploadError) {
            console.error("Erro ao enviar mídia:", uploadError);
            btnEnviar.disabled = false;
            mostrarStatus(formStatus, `A avaliação foi criada, mas não foi possível enviar o arquivo "${arquivo.name}". Tente novamente com arquivos menores.`, true);
            return;
        }

        const { data: urlData } = db.storage
            .from("avaliacoes")
            .getPublicUrl(caminho);

        midiasSalvas.push({
            tipo: arquivo.type.startsWith("video/") ? "video" : "foto",
            url: urlData.publicUrl,
            caminho
        });
    }

    if (midiasSalvas.length > 0) {
        const { error: midiasError } = await db
            .from("avaliacao_midias")
            .insert(
                midiasSalvas.map((midia) => ({
                    avaliacao_id: avaliacao.id,
                    tipo: midia.tipo,
                    url: midia.url,
                    caminho: midia.caminho
                }))
            );

        if (midiasError) {
            console.error("Erro ao registrar mídias:", midiasError);
            btnEnviar.disabled = false;
            mostrarStatus(formStatus, "A avaliação foi criada, mas não foi possível registrar as mídias.", true);
            return;
        }
    }

    btnEnviar.disabled = false;


    mostrarStatus(formStatus, "Avaliação enviada com sucesso!");
    avaliacaoForm.reset();

    document.querySelectorAll(".nota-btn").forEach((item) => {
        item.classList.remove("selected");
    });

    notaInput.value = "";
    if (midiasInput) midiasInput.value = "";
    if (midiasPreview) midiasPreview.innerHTML = "";
    await carregarAvaliacoes();
});

btnLocalizacao.addEventListener("click", () => {
    obterLocalizacao();
});

btnCentralizar.addEventListener("click", () => {
    if (latitude !== null && longitude !== null && map) {
        map.setView([latitude, longitude], 17);
    } else {
        obterLocalizacao();
    }
});

async function carregarAvaliacoes() {
    const { data, error } = await db
        .from("avaliacoes")
        .select(`
            id,
            nota,
            comentario,
            localizacao,
            criado_em,
            bairro,
            cidade,
            estado,
            endereco_formatado,
            categorias (nome),
            avaliacao_midias (id, tipo, url)
        `)
        .order("criado_em", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Erro ao carregar avaliações:", error);
        avaliacoesLista.innerHTML = "<p>Não foi possível carregar as avaliações.</p>";
        return;
    }

    if (!data || data.length === 0) {
        avaliacoesLista.innerHTML = "<p>Nenhuma avaliação registrada ainda.</p>";
        return;
    }

    avaliacoesLista.innerHTML = data.map((avaliacao) => {
        const bairro = avaliacao.bairro || "Bairro não informado";
        const categoria = avaliacao.categorias?.nome || "Categoria não informada";
        const comentario = avaliacao.comentario
            ? escaparHTML(avaliacao.comentario)
            : "Sem comentário.";
        const dataFormatada = avaliacao.criado_em
            ? new Date(avaliacao.criado_em).toLocaleString("pt-BR")
            : "";
        const midias = avaliacao.avaliacao_midias || [];
        const midiasHTML = midias.length > 0
            ? `<div class="avaliacao-midias">${midias.map((midia) => {
                if (midia.tipo === "video") {
                    return `<video controls preload="metadata" src="${escaparHTML(midia.url)}"></video>`;
                }
                return `<img src="${escaparHTML(midia.url)}" alt="Imagem da avaliação" loading="lazy">`;
            }).join("")}</div>`
            : "";

        return `
            <article class="avaliacao-item">
                <div class="avaliacao-topo">
                    <strong>${escaparHTML(bairro)}</strong>
                    <span class="avaliacao-nota">${avaliacao.nota}/10</span>
                </div>
                <div class="avaliacao-meta">${escaparHTML(categoria)} • ${dataFormatada}</div>
                <small class="avaliacao-endereco">${escaparHTML(avaliacao.endereco_formatado || [avaliacao.cidade, avaliacao.estado].filter(Boolean).join(" - "))}</small>
                <p>${comentario}</p>
                ${midiasHTML}
            </article>
        `;
    }).join("");

    atualizarMarcadores(data);
}

function atualizarMarcadores(avaliacoes) {
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    avaliacoes.forEach((avaliacao) => {
        const ponto = extrairPonto(avaliacao.localizacao);
        if (!ponto) return;

        const bairro = avaliacao.bairro || "Bairro";
        const categoria = avaliacao.categorias?.nome || "Categoria";

        const marker = L.marker([ponto.latitude, ponto.longitude]);

        marker.bindPopup(`
            <strong>${escaparHTML(bairro)}</strong><br>
            ${escaparHTML(categoria)}<br>
            Nota: ${avaliacao.nota}/10
        `);

        marker.addTo(markersLayer);
    });
}

function extrairPonto(localizacao) {
    if (!localizacao) return null;

    if (typeof localizacao === "object") {
        if (Array.isArray(localizacao.coordinates) && localizacao.coordinates.length >= 2) {
            return {
                longitude: Number(localizacao.coordinates[0]),
                latitude: Number(localizacao.coordinates[1])
            };
        }
        return null;
    }

    const match = String(localizacao).match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);

    if (!match) return null;

    return {
        longitude: Number(match[1]),
        latitude: Number(match[2])
    };
}

function atualizarPreviewMidias() {
    if (!midiasPreview || !midiasInput) return;

    const arquivos = Array.from(midiasInput.files || []);
    midiasPreview.innerHTML = arquivos.map((arquivo) => {
        const tamanhoMB = (arquivo.size / (1024 * 1024)).toFixed(1);
        const tipo = arquivo.type.startsWith("video/") ? "Vídeo" : "Foto";
        return `
            <div class="midia-arquivo">
                <span>📎</span>
                <div>
                    <strong>${escaparHTML(arquivo.name)}</strong>
                    <small>${tipo} • ${tamanhoMB} MB</small>
                </div>
            </div>
        `;
    }).join("");
}

function mostrarStatus(elemento, mensagem, erro = false) {
    elemento.textContent = mensagem;
    elemento.style.color = erro ? "#b42318" : "#16745a";
}

function escaparHTML(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
