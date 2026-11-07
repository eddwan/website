// Redireciona www.eddwan.com/<caminho>?<busca> para https://eddwan.com/<caminho>?<busca> (301).
// Worker separado para o site principal continuar só com arquivos estáticos.
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = 'eddwan.com';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  },
};
