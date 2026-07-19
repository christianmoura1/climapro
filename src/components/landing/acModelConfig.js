// URLs dos modelos GLB gerados via Higgsfield (SAM 3 3D) a partir de uma
// foto de estúdio do equipamento desmontado. Se qualquer download falhar em
// runtime (CDN fora do ar, CORS), a cena cai automaticamente para as peças
// estilizadas construídas com geometrias do Three.js.
//
// Para servir localmente: baixe cada arquivo e salve em public/models/<key>.glb,
// depois troque as URLs por "/models/<key>.glb".
const CDN = "https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a";

export const AC_MODEL_URLS = {
  tampa: `${CDN}/874e7574-0934-4b33-8a79-54e913ecd734.glb`,
  filtros: `${CDN}/e772d51f-a5c7-431b-875d-9ea13a4f8dcf.glb`,
  serpentina: `${CDN}/7dcb2601-0d87-4bf4-a2f6-7c8e80acf8af.glb`,
  turbina: `${CDN}/315fa2db-9745-4845-a0d1-3684e503dffe.glb`,
  motor: `${CDN}/2f56d6d5-79b7-4c27-be94-88bec318ceb7.glb`,
  placa: `${CDN}/a9041091-894e-4dae-9900-1110548b6226.glb`,
  sensores: null,
  bandeja: `${CDN}/de2f9592-60b0-4ee7-8bc8-0ba979a66c59.glb`,
  estrutura: `${CDN}/50a3e502-32e2-49e8-a75f-39ec69cdd229.glb`
};
