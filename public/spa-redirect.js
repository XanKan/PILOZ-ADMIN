(function(){
  var marker=document.querySelector('meta[name="piloz-spa-fallback"]');
  if(marker){sessionStorage.setItem("piloz-admin-path",location.pathname+location.search+location.hash);location.replace("/");return;}
  var path=sessionStorage.getItem("piloz-admin-path");
  if(path){sessionStorage.removeItem("piloz-admin-path");history.replaceState(null,"",path);}
})();
