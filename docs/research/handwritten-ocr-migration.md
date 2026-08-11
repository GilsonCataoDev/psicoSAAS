# Migração de anotações manuscritas para o UseCognia

**Pesquisa:** 1º de agosto de 2026
**Escopo:** muitas páginas manuscritas em português, dados clínicos sensíveis, integração com NestJS/React e custo inicial próximo de zero.

## Resposta executiva

É viável criar uma **migração assistida**, não uma importação automática confiável. A caligrafia varia muito, os modelos abertos mais acessíveis não oferecem garantia específica para português clínico manuscrito e um erro pode alterar o sentido de um registro. O original deve permanecer anexado e cada sessão só pode entrar no prontuário depois da revisão e confirmação do psicólogo.

Recomendação:

1. Fazer um piloto local com 20 páginas reais, desidentificadas quando possível.
2. Comparar **PaddleOCR** com **TrOCR Small**; usar PaddleOCR para localizar linhas e TrOCR apenas como segundo reconhecedor experimental.
3. Medir o tempo de revisão, não apenas a quantidade de texto reconhecido.
4. Lançar primeiro upload em lote + fila de revisão, sem salvar automaticamente no prontuário.
5. Só criar um worker de OCR em produção se o piloto reduzir o trabalho manual em pelo menos 40%.

Isso evita contratar API agora. “Open source” elimina cobrança por página, mas processamento em Railway, armazenamento e manutenção continuam consumindo recursos.

## Comparação das opções

| Opção | Licença | Atividade observada | Português | Manuscrito | Hardware/implantação | Veredito |
|---|---|---|---|---|---|---|
| **PaddleOCR** | Apache-2.0 | Projeto muito ativo; releases e documentação recentes | O PP-OCRv5 multilíngue inclui português | O PP-OCRv5 principal declara melhorias em manuscrito chinês/inglês; isso **não comprova** a mesma qualidade para manuscrito em português. O PaddleOCR-VL declara manuscrito e 109 idiomas, mas é mais pesado | Python/C++ e opções CPU/GPU; modelos mobile pequenos; pode ser local, self-hosted e, nas versões atuais, navegador | **Melhor ponto de partida para detectar páginas/linhas e obter um primeiro rascunho**. Exige benchmark com a caligrafia da cliente |
| **Tesseract** | Apache-2.0 | Maduro e ativo; versão 5.5.2 publicada em 2025 | Possui `por.traineddata` | A própria documentação afirma que não funciona bem, pois foi projetado para texto impresso | CPU, leve, fácil de empacotar; PDF precisa ser convertido em imagens ou passar pelo OCRmyPDF | Bom para páginas digitadas, datas/números bem formados e fallback. **Não usar como motor principal de caligrafia** |
| **docTR** | Apache-2.0 | Ativo; release 1.0.1 em 2026 | Reconhecimento depende do vocabulário/modelo escolhido; não há modelo oficial comprovado para este caso | O pedido oficial de suporte a manuscrito segue como funcionalidade aberta | Python 3.10+, PyTorch; roda em CPU ou GPU; recebe PDF multipágina e exporta estrutura JSON | Boa biblioteca de detecção/layout, mas **não é a escolha principal para reconhecer as notas manuscritas** |
| **TrOCR** | MIT no repositório Microsoft; conferir também a licença do checkpoint escolhido | Código/modelos oficiais de TrOCR tiveram seu foco de lançamento em 2021–2023; integração Transformers segue utilizável | Checkpoints oficiais manuscritos foram ajustados no IAM, voltado a inglês; não há garantia oficial para português | É específico para manuscrito, porém o modelo bruto recebe **uma linha de texto por imagem**, não uma página inteira | Small ~62M parâmetros; CPU é possível, GPU melhora vazão; exige segmentador de linhas e serviço Python | Melhor experimento de segunda etapa. Para português clínico, pode precisar de ajuste fino com transcrições revisadas |
| **Apple Vision/VisionKit** | Framework proprietário incluído no ecossistema Apple | Mantido pela Apple | A API informa idiomas suportados em tempo de execução; é preciso confirmar `pt-BR` no iPad alvo | Vision reconhece texto em imagens. Recursos novos do PencilKit reconhecem escrita como traços, mas não devem ser confundidos com OCR de fotos de cadernos | Processamento Vision é no dispositivo; integração direta exige app iOS/Swift ou plugin Capacitor próprio | Excelente opção futura de privacidade no iPad, mas **não resolve hoje apenas com a PWA React** e precisa ser testada no dispositivo/versão de iPadOS |

### Evidências principais

- O [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) é Apache-2.0, oferece execução local e mantém modelos para implantação. O [modelo multilíngue PP-OCRv5](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/algorithm/PP-OCRv5/PP-OCRv5_multi_languages.en.md) lista português; a [documentação do PP-OCRv5](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/algorithm/PP-OCRv5/PP-OCRv5.md) mede manuscrito chinês e inglês. Portanto, suporte ao alfabeto português e desempenho em caligrafia portuguesa são questões diferentes.
- O [PaddleOCR.js](https://www.paddleocr.ai/latest/en/version3.x/inference_deployment/cross_platform/browser.html) permite inferência no navegador. Isso merece um protótipo isolado no Safari do iPad, pois disponibilidade não prova que dezenas de páginas terão memória, temperatura e velocidade aceitáveis.
- O [FAQ oficial do Tesseract](https://tesseract-ocr.github.io/tessdoc/FAQ.html) diz explicitamente que ele foi projetado para texto impresso e não funciona bem com escrita manual. O projeto é [Apache-2.0](https://github.com/tesseract-ocr/tesseract), possui [dados para português](https://github.com/tesseract-ocr/tesseract/wiki/Data-Files) e não lê PDF diretamente, conforme os [formatos de entrada](https://tesseract-ocr.github.io/tessdoc/InputFormats.html).
- O [docTR](https://github.com/mindee/doctr) é Apache-2.0, requer Python 3.10+ e seu [quickstart](https://mindee.github.io/doctr/latest/getting_started/quickstart.html) processa PDFs multipágina. Porém, o [suporte oficial a manuscrito](https://github.com/mindee/doctr/issues/1049) permanece registrado como funcionalidade pendente.
- O [TrOCR da Microsoft](https://github.com/microsoft/unilm/tree/master/trocr) é um reconhecedor transformer. O checkpoint [trocr-small-handwritten](https://huggingface.co/microsoft/trocr-small-handwritten) foi ajustado no IAM e sua utilização declarada é imagem de uma única linha; ele não faz sozinho segmentação de páginas. O repositório Microsoft UniLM está sob [licença MIT](https://github.com/microsoft/unilm).
- A Apple documenta que [Vision executa no dispositivo](https://developer.apple.com/videos/play/wwdc2025/272/) e que `RecognizeTextRequest` oferece confiança, caixas de texto e idiomas suportados consultáveis no aparelho, conforme o [exemplo oficial](https://developer.apple.com/documentation/vision/locating-and-displaying-recognized-text). O [DataScanner do VisionKit](https://developer.apple.com/documentation/visionkit/datascannerviewcontroller/supportedtextrecognitionlanguages) também expõe sua lista de idiomas. Os recursos de reconhecimento de escrita do PencilKit anunciados para iPadOS 27 trabalham com escrita capturada pelo Apple Pencil e exigem validação de disponibilidade antes de entrar no roadmap.

## Alternativas úteis encontradas no GitHub

### Umi-OCR para validar sem desenvolver

O [Umi-OCR](https://github.com/hiroi-sora/Umi-OCR) é MIT, roda offline no Windows e aceita imagens/PDFs em lote, inclusive por HTTP/API local. Ele usa componentes do ecossistema PaddleOCR. É a forma mais rápida de testar 20 páginas sem enviar dados a terceiros nem alterar o UseCognia.

Ele serve para **piloto interno**, não para virar dependência automática do SaaS sem uma auditoria do pacote distribuído, modelos incluídos, atualização e cadeia de dependências.

### OCRmyPDF para preservar PDFs pesquisáveis

O [OCRmyPDF](https://github.com/ocrmypdf/OCRmyPDF) é MPL-2.0, cria uma camada pesquisável em PDFs e usa Tesseract. Pode ajudar em materiais impressos misturados às notas, mas herda a limitação do Tesseract para caligrafia. Modificações no próprio OCRmyPDF precisam respeitar a MPL-2.0.

### Kraken para uma fase de treinamento personalizado

O [Kraken](https://github.com/mittagessen/kraken) é Apache-2.0 e foi criado para OCR/HTR, inclusive material manuscrito. Ele se torna interessante quando houver um conjunto de páginas corrigidas para treinar um modelo da caligrafia recorrente. Isso não é MVP: exige anotação, avaliação e manutenção de modelo.

## Compatibilidade com o UseCognia atual

O projeto já tem uma base útil:

- NestJS/React e projeto Capacitor para mobile;
- anexos de pacientes com isolamento por `psychologistId`;
- PDF/JPG/PNG com validação de assinatura do arquivo;
- conteúdo criptografado com AES-256-GCM no Postgres ou no bucket privado;
- download autenticado, `Cache-Control: private, no-store` e eventos de auditoria.

Os limites atuais não atendem uma migração grande: o envio aceita um arquivo por requisição, 10 MB por arquivo e até 50 anexos por paciente. Em vez de aumentar tudo sem controle, a migração deve tratar o PDF como um **lote**, dividir páginas no processamento e manter somente o PDF original mais os rascunhos necessários.

## Arquitetura proposta

```text
PDF/fotos no iPad
       |
       v
Upload autenticado e criptografado
       |
       v
Lote de migração (aguardando -> processando -> revisão -> concluído)
       |
       v
Páginas temporárias -> detecção/segmentação -> OCR local
       |
       v
Original + rascunho lado a lado
       |
       v
Psicólogo corrige data e conteúdo
       |
       v
Confirmação explícita -> sessão/prontuário
```

### Separação técnica

- **NestJS:** autenticação, autorização, criação do lote, estados, auditoria e gravação final.
- **Worker Python isolado:** rasterização, correção de rotação/contraste, PaddleOCR e, opcionalmente, TrOCR. Ele recebe identificadores opacos, não nomes de pacientes.
- **React:** upload, progresso por página, original e transcrição lado a lado, atalhos de revisão e confirmação.
- **Armazenamento:** original criptografado; imagens temporárias com prazo curto; texto OCR criptografado e nunca incluído em logs.

Para custo inicial zero, o primeiro piloto roda no computador do desenvolvedor com Umi-OCR/PaddleOCR. Um worker permanente no Railway só entra depois de comprovar ganho e definir limites do plano. Rodar OCR pesado dentro do processo web NestJS não é recomendado: pode consumir memória, atrasar a API e reiniciar durante lotes grandes.

## Plano de implementação

### Fase 0 — benchmark, sem alterar produção (4–8 horas)

1. Selecionar 20 páginas: letra fácil, média e difícil, com diferentes canetas/iluminação.
2. Criar uma transcrição correta de 5 páginas para referência.
3. Rodar Umi-OCR/PaddleOCR e TrOCR Small localmente.
4. Medir CER (erro por caractere), datas reconhecidas e minutos de revisão por página.
5. Avançar somente se a revisão consumir no máximo 60% do tempo de digitação manual.

### Fase 1 — MVP seguro, sem OCR automático (2–4 dias)

- Upload de PDF multipágina como lote.
- Associação explícita a um único paciente antes do envio.
- Visualização página a página ao lado de um editor de sessão.
- Atalhos: repetir paciente, adicionar data, salvar rascunho e confirmar próxima página.
- Progresso, pausa/retomada e relatório de páginas concluídas.

Essa fase já reduz o trabalho: elimina alternância entre papel e sistema, organiza a fila e preserva rastreabilidade, sem depender da qualidade de IA.

### Fase 2 — OCR experimental local (3–6 dias)

- Worker PaddleOCR separado e desligável por feature flag.
- Processamento assíncrono por página, com limite de concorrência 1 em CPU.
- Confiança visível; trechos duvidosos destacados.
- Nunca criar sessão automaticamente.
- Exclusão das imagens temporárias ao concluir ou após, no máximo, 24 horas.

### Fase 3 — escala (somente após clientes pagantes)

- Fila durável e worker dedicado.
- Limites por plano, páginas/mês e tamanho do lote.
- PaddleOCR + TrOCR apenas se o segundo modelo provar ganho mensurável.
- Ajuste fino por caligrafia somente com base jurídica definida, amostras revisadas e processo de exclusão.
- Plugin Capacitor/Swift para avaliar Vision no iPad sem transmitir as imagens ao servidor.

## Teste de aceitação

O piloto deve registrar:

| Métrica | Regra para avançar |
|---|---|
| Associação ao paciente | 100% explícita e confirmada; nunca inferida apenas pelo OCR |
| Criação de sessão | 100% depende de confirmação humana |
| Tempo mediano de revisão | até 60% do tempo de digitação do zero |
| Datas e doses/números | sempre destacadas para conferência, independentemente da confiança |
| Páginas ilegíveis | marcadas como “requer transcrição manual”, sem texto inventado |
| Recuperação de falha | lote retoma da última página salva sem duplicar sessão |

Não há uma porcentagem única de acurácia que torne o conteúdo clínico seguro. Um texto com 95% de caracteres corretos ainda pode errar a palavra clinicamente mais importante.

## Privacidade e segurança obrigatórias

Registros clínicos são dados pessoais sensíveis: a [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) inclui dados de saúde nessa categoria e exige medidas técnicas e administrativas contra acesso, perda, alteração ou tratamento inadequado. O [guia da ANPD para agentes de pequeno porte](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-guia-de-seguranca-para-agentes-de-tratamento-de-pequeno-porte) reforça medidas administrativas e técnicas.

Controles mínimos:

1. Não enviar páginas para APIs gratuitas, demos públicas, Hugging Face Spaces ou serviços sem contrato de tratamento de dados.
2. Isolar lote, arquivo, página e rascunho por `psychologistId` e `patientId`; incluir testes de tenant A/B.
3. Criptografar original e rascunho, remover metadados EXIF e não registrar texto clínico em logs/analytics/erros.
4. Validar PDF real, quantidade de páginas, resolução, tamanho descompactado e arquivos maliciosos; processar em contêiner sem rede e com CPU/memória/tempo limitados.
5. Manter trilha de quem enviou, revisou, confirmou e excluiu; oferecer cancelamento e descarte dos temporários.

Se o OCR for futuramente enviado ao Copiloto clínico, o texto reconhecido deve ser tratado como dado não confiável, nunca como instrução para o modelo, e somente após revisão do profissional.

## Riscos e limitações

- Letra cursiva sobreposta, abreviações pessoais e termos clínicos terão erros frequentes.
- Português nos modelos multilíngues não comprova qualidade em manuscrito brasileiro.
- Segmentação de linhas é tão importante quanto o reconhecedor; TrOCR sozinho não processa uma página.
- CPU compartilhada pode tornar dezenas de páginas lentas e elevar o custo do Railway.
- Ajuste fino pode melhorar a escrita recorrente, mas cria um novo ativo sensível que precisa de governança e exclusão.
- Apple Vision protege melhor por executar no dispositivo, porém exige código nativo, versão compatível do iPadOS e teste real de idioma/qualidade.

## Decisão recomendada

**Começar pelo piloto offline com Umi-OCR/PaddleOCR e 20 páginas.** Se houver ganho real, implementar a Fase 1 (fila de revisão) antes do worker. Para o primeiro produto, PaddleOCR é a opção mais equilibrada; Tesseract e docTR não atendem bem à caligrafia, e TrOCR deve entrar apenas como experimento em linhas segmentadas. Apple Vision fica no roadmap do aplicativo iPad nativo.
