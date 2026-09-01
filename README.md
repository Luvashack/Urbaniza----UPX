# 🏙️ Avaliação Urbana

Aplicação web desenvolvida para auxiliar na avaliação de regiões urbanas, permitindo registrar e visualizar informações relacionadas à infraestrutura, mobilidade e qualidade dos espaços urbanos.

## 🎯 Objetivo

O projeto tem como objetivo criar uma ferramenta que permita aos usuários avaliar diferentes regiões de uma cidade a partir de categorias relacionadas à urbanização e mobilidade.

As avaliações são armazenadas em um banco de dados e podem posteriormente ser utilizadas para gerar informações e indicadores sobre as condições das regiões avaliadas.

## 🚀 Funcionalidades

* 📍 Visualização de regiões através de um mapa
* ⭐ Avaliação de regiões urbanas
* 🚗 Avaliação de mobilidade
* 🛣️ Avaliação de infraestrutura
* 📊 Armazenamento das avaliações
* 🗺️ Visualização das informações no mapa
* 📈 Geração de dados para análise das regiões

## 🛠️ Tecnologias utilizadas

* **HTML5** — estrutura da aplicação
* **CSS3** — estilização e responsividade
* **JavaScript** — lógica e interatividade
* **Leaflet** — mapas interativos
* **OpenStreetMap** — dados cartográficos
* **Supabase** — banco de dados e backend
* **PostgreSQL** — gerenciamento do banco de dados

## 📁 Estrutura do projeto

```text
avaliacao-urbana/
│
├── assets/
│   ├── images/
│   └── icons/
│
├── css/
│   ├── style.css
│   └── responsive.css
│
├── js/
│   ├── components/
│   ├── pages/
│   └── services/
│       └── supabase.js
│
├── docs/
│
├── supabase/
│   ├── schema.sql
│   ├── rls.sql
│   └── seed.sql
│
├── .env.example
├── .gitignore
├── index.html
└── README.md
```

## 🗄️ Banco de dados

O projeto utiliza o **Supabase** como backend e **PostgreSQL** como sistema de gerenciamento do banco de dados.

O banco é responsável por armazenar as informações relacionadas às avaliações realizadas pelos usuários.

Os scripts SQL utilizados no projeto podem ser encontrados na pasta:

```text
supabase/
```

### Principais arquivos

* `schema.sql` — criação das tabelas e estruturas do banco
* `rls.sql` — configuração das políticas de Row Level Security
* `seed.sql` — dados utilizados para testes

## 🔐 Segurança

O projeto utiliza **Row Level Security (RLS)** para controlar o acesso aos dados armazenados no Supabase.

Informações sensíveis, como chaves e variáveis de ambiente, não devem ser armazenadas diretamente no repositório.

Para isso, o projeto utiliza um arquivo `.env` local e disponibiliza um `.env.example` como modelo.


## 💻 Como executar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/SEU-USUARIO/avaliacao-urbana.git
```

### 2. Entre na pasta do projeto

```bash
cd avaliacao-urbana
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` baseado no:

```text
.env.example
```

Preencha as informações necessárias do projeto.

*OBS: Antes de fazer alteraçõe no projeto, faça login no terminal do Vs Code

Email: git config --global user.email "Seu-email";
Nome: git config --global user.email "Seu-nome";


### 4. Execute a aplicação

Abra o projeto utilizando um servidor local, como o **Live Server**, ou utilize o método de execução definido pela equipe.

## 📚 Documentação

A documentação do projeto está disponível na pasta:

```text
docs/
```

Nela serão armazenadas informações sobre:

* Requisitos do sistema
* Arquitetura do projeto
* Banco de dados
* Regras de negócio
* Configuração do Supabase
* Políticas RLS

## 📌 Status do projeto

🚧 **Em desenvolvimento**

O projeto está sendo desenvolvido como parte de um projeto acadêmico relacionado a **Smart Cities, mobilidade e urbanização**.

## 👥 Equipe

Projeto desenvolvido por:

* **Nome do integrante 1**
* **Nome do integrante 2**
* **Nome do integrante 3**
* **Nome do integrante 4**

## 📄 Licença

Este projeto foi desenvolvido para fins acadêmicos.
