const SUPABASE_URL = "https://xjrbsaytdlucnhvpoqcj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Bk5rQIdwj3hGyOxU5Ursfw_5XKDcT1h";

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

    inicializarMapa();

    if (!window.supabase) {
        mostrarStatus(
            localizacaoStatus,
            "Mapa carregado. Serviço de avaliações indisponível.",
            true
        );

        avaliacoesLista.innerHTML =
            "<p>Não foi possível conectar ao serviço de avaliações.</p>";

        return;
    }

    await carregarAvaliacoes();
    obterLocalizacao();
});


// ============================================================
// NOTAS
// ============================================================

function configurarNotas() {
    const botoesNota = document.querySelectorAll(".nota-btn");

    botoesNota.forEach((botao) => {
        botao.addEventListener("click", () => {
            botoesNota.forEach((item) =>
                item.classList.remove("selected")
            );

            botao.classList.add("selected");
            notaInput.value = botao.dataset.nota;
        });
    });
}


// ============================================================
// MAPA
// ============================================================

function inicializarMapa() {
    const mapElement = document.getElementById("map");

    if (!window.L) {
        mapElement.innerHTML = `
            <div style="
                height:100%;
                display:grid;
                place-items:center;
                padding:20px;
                text-align:center;
                color:#68736e;
            ">
                <div>
                    <strong>Não foi possível carregar o mapa.</strong>

                    <p style="margin:8px 0 0;">
                        Verifique sua conexão com a internet e recarregue a página.
                    </p>
                </div>
            </div>
        `;

        mostrarStatus(
            localizacaoStatus,
            "Biblioteca do mapa não foi carregada.",
            true
        );

        return;
    }

    map = L.map("map").setView(
        [-23.5015, -47.4526],
        12
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}


// ============================================================
// LOCALIZAÇÃO
// ============================================================

function obterLocalizacao() {
    if (!navigator.geolocation) {
        mostrarStatus(
            localizacaoStatus,
            "Seu navegador não suporta geolocalização.",
            true
        );

        localEndereco.textContent =
            "Localização indisponível";

        localRegiao.textContent =
            "Use um navegador com suporte a GPS.";

        return;
    }

    mostrarStatus(
        localizacaoStatus,
        "Obtendo sua localização..."
    );

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            await aplicarLocalizacao(
                position.coords.latitude,
                position.coords.longitude,
                position.coords.accuracy
            );
        },

        (error) => {
            console.error(
                "Erro de geolocalização:",
                error
            );

            mostrarStatus(
                localizacaoStatus,
                "Não foi possível obter sua localização. Permita o acesso ao GPS.",
                true
            );

            localEndereco.textContent =
                "Localização não identificada";

            localRegiao.textContent =
                "Clique em “Usar minha localização” para tentar novamente.";
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}


async function aplicarLocalizacao(
    lat,
    lon,
    accuracy = null
) {
    latitude = Number(lat);
    longitude = Number(lon);

    if (map) {
        map.setView(
            [latitude, longitude],
            17
        );
    }

    if (userMarker && map) {
        map.removeLayer(userMarker);
    }

    if (accuracyCircle && map) {
        map.removeLayer(accuracyCircle);
    }

    if (map && window.L) {
        userMarker = L.marker([
            latitude,
            longitude
        ]).addTo(map);

        userMarker
            .bindPopup("<strong>Você está aqui</strong>")
            .openPopup();

        if (
            accuracy &&
            Number.isFinite(accuracy)
        ) {
            accuracyCircle = L.circle(
                [latitude, longitude],
                {
                    radius: accuracy,
                    weight: 1,
                    fillOpacity: 0.08
                }
            ).addTo(map);
        }
    }

    mostrarStatus(
        localizacaoStatus,
        "Localização encontrada. Identificando endereço..."
    );

    try {
        enderecoAtual =
            await obterEnderecoPorCoordenadas(
                latitude,
                longitude
            );

        localEndereco.textContent =
            formatarLinhaPrincipal(
                enderecoAtual
            );

        localRegiao.textContent =
            formatarLinhaLocalidade(
                enderecoAtual
            );

        mostrarStatus(
            localizacaoStatus,
            "Endereço identificado automaticamente. Você já pode fazer sua avaliação."
        );

    } catch (error) {
        console.error(
            "Erro ao identificar endereço:",
            error
        );

        enderecoAtual = null;

        localEndereco.textContent =
            "Endereço não identificado";

        localRegiao.textContent =
            "Não foi possível obter o endereço desta localização.";

        mostrarStatus(
            localizacaoStatus,
            "GPS encontrado, mas não foi possível identificar o endereço.",
            true
        );
    }
}


// ============================================================
// BUSCAR ENDEREÇO PELO GPS
// ============================================================

async function obterEnderecoPorCoordenadas(
    lat,
    lon
) {
    const chaveCache =
        `urbaniza-endereco:${lat.toFixed(5)}:${lon.toFixed(5)}`;

    const cache =
        sessionStorage.getItem(chaveCache);

    if (cache) {
        return JSON.parse(cache);
    }

    const url =
        new URL(
            "https://nominatim.openstreetmap.org/reverse"
        );

    url.searchParams.set(
        "lat",
        lat.toFixed(7)
    );

    url.searchParams.set(
        "lon",
        lon.toFixed(7)
    );

    url.searchParams.set(
        "format",
        "jsonv2"
    );

    url.searchParams.set(
        "addressdetails",
        "1"
    );

    url.searchParams.set(
        "zoom",
        "18"
    );

    url.searchParams.set(
        "layer",
        "address"
    );

    url.searchParams.set(
        "accept-language",
        "pt-BR"
    );

    const resposta = await fetch(
        url.toString(),
        {
            headers: {
                "Accept": "application/json"
            }
        }
    );

    if (!resposta.ok) {
        throw new Error(
            `Serviço de endereço retornou HTTP ${resposta.status}.`
        );
    }

    const resultado =
        await resposta.json();

    const endereco =
        resultado?.address || {};

    const cidade =
        endereco.city ||
        endereco.town ||
        endereco.municipality;

    const estado =
        endereco.state;

    const pais =
        endereco.country_code;

    if (
        pais &&
        pais.toLowerCase() !== "br"
    ) {
        throw new Error(
            "A localização identificada não está no Brasil."
        );
    }

    if (
        cidade &&
        normalizarTexto(cidade) !== "sorocaba"
    ) {
        throw new Error(
            `Localização identificada fora de Sorocaba: ${cidade}.`
        );
    }

    if (
        estado &&
        !normalizarTexto(estado).includes("sao paulo")
    ) {
        throw new Error(
            `Localização identificada fora de São Paulo: ${estado}.`
        );
    }

    const bairro =
        endereco.neighbourhood ||
        endereco.suburb ||
        endereco.quarter ||
        endereco.city_district ||
        endereco.residential ||
        endereco.hamlet ||
        "";

    const logradouro =
        endereco.road ||
        endereco.pedestrian ||
        endereco.footway ||
        "";

    const numero =
        endereco.house_number || "";

    const cep =
        endereco.postcode || "";

    const cidadeFinal =
        cidade || "Sorocaba";

    const estadoFinal =
        estado || "São Paulo";

    if (!logradouro && !bairro) {
        throw new Error(
            "O serviço de geocodificação não retornou rua ou bairro."
        );
    }

    const enderecoFormatado = [
        logradouro
            ? `${logradouro}${numero ? `, ${numero}` : ""}`
            : null,

        bairro || null,
        cidadeFinal,
        estadoFinal,
        cep || null

    ]
        .filter(Boolean)
        .join(" • ");

    const dados = {
        logradouro,
        numero,
        bairro,
        cidade: cidadeFinal,
        estado: estadoFinal,
        cep,
        endereco_formatado: enderecoFormatado
    };

    sessionStorage.setItem(
        chaveCache,
        JSON.stringify(dados)
    );

    return dados;
}


// ============================================================
// FORMATAÇÃO DO ENDEREÇO
// ============================================================

function formatarLinhaPrincipal(
    endereco
) {
    if (!endereco) {
        return "Endereço não identificado";
    }

    if (endereco.logradouro) {
        return `${endereco.logradouro}${endereco.numero ? `, ${endereco.numero}` : ""}`;
    }

    return (
        endereco.bairro ||
        "Endereço não identificado"
    );
}


function formatarLinhaLocalidade(
    endereco
) {
    if (!endereco) {
        return "";
    }

    const localidade = [
        endereco.bairro,
        endereco.cidade
    ]
        .filter(Boolean)
        .join(", ");

    const estado =
        endereco.estado || "";

    const cep =
        endereco.cep
            ? ` • CEP ${endereco.cep}`
            : "";

    return [
        localidade,
        estado
    ]
        .filter(Boolean)
        .join(" - ") + cep;
}


function normalizarTexto(valor) {
    return String(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}


// ============================================================
// CONVERTER ESTADO PARA SIGLA
// ============================================================

function obterUF(estado) {
    const valor = normalizarTexto(estado);

    if (
        valor === "sao paulo" ||
        valor === "sp"
    ) {
        return "SP";
    }

    if (
        valor === "rio de janeiro" ||
        valor === "rj"
    ) {
        return "RJ";
    }

    if (
        valor === "minas gerais" ||
        valor === "mg"
    ) {
        return "MG";
    }

    return estado || null;
}


// ============================================================
// BUSCAR OU CADASTRAR BAIRRO
// ============================================================

async function obterOuCadastrarBairro(
    nomeBairro,
    cidade,
    estado
) {
    const nome = String(nomeBairro || "").trim();

    const cidadeFinal = String(
        cidade || "Sorocaba"
    ).trim();

    const estadoFinal = obterUF(estado);

    console.log("=== IDENTIFICAÇÃO DO BAIRRO ===");
    console.log("Nome:", nome);
    console.log("Cidade:", cidadeFinal);
    console.log("Estado:", estadoFinal);

    if (!nome) {
        console.error("O Nominatim não retornou um nome de bairro.");
        return null;
    }

    // ========================================================
    // 1. PROCURAR O BAIRRO
    // ========================================================

    const {
        data: bairroExistente,
        error: buscaError
    } = await db
        .from("bairros")
        .select("id, nome, cidade, estado")
        .ilike("nome", nome)
        .eq("cidade", cidadeFinal)
        .eq("estado", estadoFinal)
        .maybeSingle();

    if (buscaError) {
        console.error(
            "ERRO AO BUSCAR BAIRRO NO SUPABASE:",
            buscaError
        );

        return null;
    }

    // ========================================================
    // 2. BAIRRO JÁ EXISTE
    // ========================================================

    if (bairroExistente) {

        console.log(
            "Bairro encontrado:",
            bairroExistente
        );

        return bairroExistente.id;
    }

    // ========================================================
    // 3. BAIRRO NÃO EXISTE → CADASTRAR
    // ========================================================

    console.log(
        "Bairro não encontrado. Tentando cadastrar..."
    );

    const {
        data: novoBairro,
        error: cadastroError
    } = await db
        .from("bairros")
        .insert([
            {
                nome: nome,
                cidade: cidadeFinal,
                estado: estadoFinal
            }
        ])
        .select("id, nome, cidade, estado")
        .single();

    if (cadastroError) {

        console.error(
            "ERRO AO CADASTRAR BAIRRO NO SUPABASE:"
        );

        console.error(
            "Mensagem:",
            cadastroError.message
        );

        console.error(
            "Detalhes:",
            cadastroError.details
        );

        console.error(
            "Hint:",
            cadastroError.hint
        );

        console.error(
            "Código:",
            cadastroError.code
        );

        return null;
    }

    console.log(
        "Bairro cadastrado com sucesso:",
        novoBairro
    );

    return novoBairro.id;
}


// ============================================================
// ENVIAR AVALIAÇÃO
// ============================================================

avaliacaoForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const categoriaId =
            categoriaSelect.value;

        const nota =
            notaInput.value;

        const comentario =
            comentarioInput.value.trim();

        if (
            latitude === null ||
            longitude === null
        ) {
            mostrarStatus(
                formStatus,
                "Primeiro, permita o acesso à sua localização.",
                true
            );

            return;
        }

        if (!enderecoAtual) {
            mostrarStatus(
                formStatus,
                "Primeiro, identifique sua localização para obter o endereço.",
                true
            );

            return;
        }

        if (
            !categoriaId ||
            !nota
        ) {
            mostrarStatus(
                formStatus,
                "Escolha uma categoria e uma nota.",
                true
            );

            return;
        }

        const arquivos =
            Array.from(
                midiasInput?.files || []
            );

        if (
            arquivos.length >
            MAX_ARQUIVOS
        ) {
            mostrarStatus(
                formStatus,
                `Selecione no máximo ${MAX_ARQUIVOS} arquivos.`,
                true
            );

            return;
        }

        const arquivoInvalido =
            arquivos.find(
                (arquivo) => {

                    const tamanhoMB =
                        arquivo.size /
                        (1024 * 1024);

                    const tipoValido =
                        arquivo.type.startsWith(
                            "image/"
                        ) ||
                        arquivo.type.startsWith(
                            "video/"
                        );

                    return (
                        !tipoValido ||
                        tamanhoMB >
                            MAX_TAMANHO_MB
                    );
                }
            );

        if (arquivoInvalido) {
            mostrarStatus(
                formStatus,
                `O arquivo "${arquivoInvalido.name}" é inválido. Use apenas fotos/vídeos de até ${MAX_TAMANHO_MB} MB.`,
                true
            );

            return;
        }

        btnEnviar.disabled = true;

        mostrarStatus(
            formStatus,
            "Identificando bairro..."
        );


        // ====================================================
        // BUSCAR/CADASTRAR BAIRRO
        // ====================================================

        let bairroId = null;

        if (enderecoAtual.bairro) {

            bairroId =
                await obterOuCadastrarBairro(
                    enderecoAtual.bairro,
                    enderecoAtual.cidade,
                    enderecoAtual.estado
                );

            
         if (!bairroId) {
    btnEnviar.disabled = false;

    mostrarStatus(
        formStatus,
        "Erro ao identificar/cadastrar o bairro. Pressione F12 e veja o Console.",
        true
    );

    return;
}
}


        // ====================================================
        // SALVAR AVALIAÇÃO
        // ====================================================

        mostrarStatus(
            formStatus,
            "Enviando avaliação..."
        );

        const {
            data: avaliacao,
            error: avaliacaoError
        } = await db
            .from("avaliacoes")
            .insert([
                {
                    categoria:
                        categoriaId,

                    bairro_id:
                        bairroId,

                    nota:
                        Number(nota),

                    comentario:
                        comentario || null,

                    latitude:
                        latitude,

                    longitude:
                        longitude,

                    logradouro:
                        enderecoAtual.logradouro ||
                        null,

                    numero:
                        enderecoAtual.numero ||
                        null,

                    bairro:
                        enderecoAtual.bairro ||
                        null,

                    cidade:
                        enderecoAtual.cidade ||
                        null,

                    estado:
                        obterUF(
                            enderecoAtual.estado
                        ),

                    cep:
                        enderecoAtual.cep ||
                        null,

                    endereco_formatado:
                        enderecoAtual.endereco_formatado ||
                        null
                }
            ])
            .select("id")
            .single();


        if (avaliacaoError) {

            btnEnviar.disabled = false;

            console.error(
                "Erro ao enviar avaliação:",
                avaliacaoError
            );

            mostrarStatus(
                formStatus,
                "Não foi possível enviar a avaliação: " +
                    avaliacaoError.message,
                true
            );

            return;
        }


        // ====================================================
        // ENVIAR FOTOS/VÍDEOS
        // ====================================================

        const midiasSalvas = [];

        for (const arquivo of arquivos) {

            const extensao =
                arquivo.name.includes(".")
                    ? arquivo.name
                          .split(".")
                          .pop()
                          .toLowerCase()
                    : "bin";

            const pasta =
                arquivo.type.startsWith(
                    "video/"
                )
                    ? "videos"
                    : "fotos";

            const nomeSeguro =
                `${Date.now()}-${crypto.randomUUID()}.${extensao}`;

            const caminho =
                `${pasta}/${avaliacao.id}/${nomeSeguro}`;


            const {
                error: uploadError
            } = await db.storage
                .from("avaliacoes")
                .upload(
                    caminho,
                    arquivo,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType:
                            arquivo.type
                    }
                );


            if (uploadError) {

               console.error("Arquivo:", arquivo.name);
               console.error("Tipo:", arquivo.type);
               console.error("Tamanho:", arquivo.size);
               console.error("Mensagem:", uploadError.menssage);
               console.error("Detalhes:", uploadError);

               btnEnviar.disabled = false;

               mostrarStatus(
                 formStatus,
                 `Erro ao enviar "${arquivo.name}": ${uploadError.menssage}`,
                 true
               );
               return;
            }


            const {
                data: urlData
            } = db.storage
                .from("avaliacoes")
                .getPublicUrl(
                    caminho
                );


            midiasSalvas.push({
                tipo:
                    arquivo.type.startsWith(
                        "video/"
                    )
                        ? "video"
                        : "foto",

                url:
                    urlData.publicUrl,

                caminho:
                    caminho
            });
        }


        // ====================================================
        // REGISTRAR MÍDIAS
        // ====================================================

        if (
            midiasSalvas.length > 0
        ) {

            const {
                error: midiasError
            } = await db
                .from("avaliacao_midias")
                .insert(
                    midiasSalvas.map(
                        (midia) => ({
                            avaliacao_id:
                                avaliacao.id,

                            tipo:
                                midia.tipo,

                            url:
                                midia.url,

                            caminho:
                                midia.caminho
                        })
                    )
                );


            if (midiasError) {

                console.error(
                    "Erro ao registrar mídias:",
                    midiasError
                );

                btnEnviar.disabled = false;

                mostrarStatus(
                    formStatus,
                    "A avaliação foi criada, mas não foi possível registrar as mídias.",
                    true
                );

                return;
            }
        }


        // ====================================================
        // FINALIZAÇÃO
        // ====================================================

        btnEnviar.disabled = false;

        mostrarStatus(
            formStatus,
            "Avaliação enviada com sucesso!"
        );

        avaliacaoForm.reset();

        document
            .querySelectorAll(".nota-btn")
            .forEach(
                (item) =>
                    item.classList.remove(
                        "selected"
                    )
            );

        notaInput.value = "";

        if (midiasInput) {
            midiasInput.value = "";
        }

        if (midiasPreview) {
            midiasPreview.innerHTML = "";
        }

        await carregarAvaliacoes();
    }
);


// ============================================================
// BOTÕES DE LOCALIZAÇÃO
// ============================================================

btnLocalizacao.addEventListener(
    "click",
    () => {
        obterLocalizacao();
    }
);


btnCentralizar.addEventListener(
    "click",
    () => {

        if (
            latitude !== null &&
            longitude !== null &&
            map
        ) {
            map.setView(
                [latitude, longitude],
                17
            );
        } else {
            obterLocalizacao();
        }
    }
);


// ============================================================
// CARREGAR AVALIAÇÕES
// ============================================================

async function carregarAvaliacoes() {

    const {
        data,
        error
    } = await db
        .from("avaliacoes")
        .select(`
            id,
            nota,
            comentario,
            latitude,
            longitude,
            criado_em,
            bairro,
            cidade,
            estado,
            endereco_formatado,
            categoria,
            avaliacao_midias (id, tipo, url)
        `)
        .order(
            "criado_em",
            {
                ascending: false
            }
        )
        .limit(20);


    if (error) {

        console.error(
            "Erro ao carregar avaliações:",
            error
        );

        avaliacoesLista.innerHTML =
            "<p>Não foi possível carregar as avaliações.</p>";

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        avaliacoesLista.innerHTML =
            "<p>Nenhuma avaliação registrada ainda.</p>";

        return;
    }


    avaliacoesLista.innerHTML =
        data.map(
            (avaliacao) => {

                const bairro =
                    avaliacao.bairro ||
                    "Bairro não informado";

                const categoria =
                    avaliacao.categoria ||
                    "Categoria não informada";

                const comentario =
                    avaliacao.comentario
                        ? escaparHTML(
                              avaliacao.comentario
                          )
                        : "Sem comentário.";

                const dataFormatada =
                    avaliacao.criado_em
                        ? new Date(
                              avaliacao.criado_em
                          ).toLocaleString(
                              "pt-BR"
                          )
                        : "";

                const midias =
                    avaliacao.avaliacao_midias ||
                    [];


                const midiasHTML =
                    midias.length > 0
                        ? `
                            <div class="avaliacao-midias">
                                ${midias
                                    .map(
                                        (midia) => {

                                            if (
                                                midia.tipo ===
                                                "video"
                                            ) {
                                                return `
                                                    <video
                                                        controls
                                                        preload="metadata"
                                                        src="${escaparHTML(midia.url)}"
                                                    ></video>
                                                `;
                                            }

                                            return `
                                                <img
                                                    src="${escaparHTML(midia.url)}"
                                                    alt="Imagem da avaliação"
                                                    loading="lazy"
                                                >
                                            `;
                                        }
                                    )
                                    .join("")}
                            </div>
                        `
                        : "";


                return `
                    <article class="avaliacao-item">

                        <div class="avaliacao-topo">

                            <strong>
                                ${escaparHTML(bairro)}
                            </strong>

                            <span class="avaliacao-nota">
                                ${avaliacao.nota}/10
                            </span>

                        </div>


                        <div class="avaliacao-meta">
                            ${escaparHTML(categoria)}
                            •
                            ${dataFormatada}
                        </div>


                        <small class="avaliacao-endereco">
                            ${escaparHTML(
                                avaliacao.endereco_formatado ||
                                [
                                    avaliacao.cidade,
                                    avaliacao.estado
                                ]
                                    .filter(Boolean)
                                    .join(" - ")
                            )}
                        </small>


                        <p>
                            ${comentario}
                        </p>


                        ${midiasHTML}

                    </article>
                `;
            }
        )
        .join("");


    atualizarMarcadores(data);
}


// ============================================================
// MARCADORES DO MAPA
// ============================================================

function atualizarMarcadores(
    avaliacoes
) {

    if (
        !map ||
        !markersLayer
    ) {
        return;
    }

    markersLayer.clearLayers();


    avaliacoes.forEach(
        (avaliacao) => {

            const lat =
                Number(
                    avaliacao.latitude
                );

            const lon =
                Number(
                    avaliacao.longitude
                );


            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lon)
            ) {
                return;
            }


            const bairro =
                avaliacao.bairro ||
                "Bairro";

            const categoria =
                avaliacao.categoria ||
                "Categoria";


            const marker =
                L.marker([
                    lat,
                    lon
                ]);


            marker.bindPopup(`
                <strong>
                    ${escaparHTML(bairro)}
                </strong>
                <br>

                ${escaparHTML(categoria)}
                <br>

                Nota:
                ${avaliacao.nota}/10
            `);


            marker.addTo(
                markersLayer
            );
        }
    );
}


// ============================================================
// PREVIEW DE FOTOS/VÍDEOS
// ============================================================

function atualizarPreviewMidias() {

    if (
        !midiasPreview ||
        !midiasInput
    ) {
        return;
    }

    const arquivos =
        Array.from(
            midiasInput.files || []
        );


    midiasPreview.innerHTML =
        arquivos
            .map(
                (arquivo) => {

                    const tamanhoMB =
                        (
                            arquivo.size /
                            (1024 * 1024)
                        ).toFixed(1);

                    const tipo =
                        arquivo.type.startsWith(
                            "video/"
                        )
                            ? "Vídeo"
                            : "Foto";


                    return `
                        <div class="midia-arquivo">

                            <span>📎</span>

                            <div>

                                <strong>
                                    ${escaparHTML(
                                        arquivo.name
                                    )}
                                </strong>

                                <small>
                                    ${tipo}
                                    •
                                    ${tamanhoMB} MB
                                </small>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


// ============================================================
// STATUS
// ============================================================

function mostrarStatus(
    elemento,
    mensagem,
    erro = false
) {
    elemento.textContent =
        mensagem;

    elemento.style.color =
        erro
            ? "#b42318"
            : "#16745a";
}


// ============================================================
// SEGURANÇA HTML
// ============================================================

function escaparHTML(valor) {

    return String(valor)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}