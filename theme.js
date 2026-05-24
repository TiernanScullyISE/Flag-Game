(function(){
  const STORAGE_KEY = "flagGameTheme";
  const DARK = "dark";
  const LIGHT = "light";

  function getStoredTheme(){
    try{
      const value = localStorage.getItem(STORAGE_KEY);
      if(value === LIGHT) return LIGHT;
      return DARK;
    }catch{
      return DARK;
    }
  }

  function setStoredTheme(theme){
    try{
      localStorage.setItem(STORAGE_KEY, theme === LIGHT ? LIGHT : DARK);
    }catch{
      // Theme preference is optional.
    }
  }

  function applyTheme(theme){
    if(theme === DARK){
      document.documentElement.dataset.theme = DARK;
    }else{
      delete document.documentElement.dataset.theme;
    }
  }

  function syncButton(button){
    const isDark = document.documentElement.dataset.theme === DARK;
    button.textContent = isDark ? "Light mode" : "Dark mode";
    button.setAttribute("aria-pressed", String(isDark));
  }

  function mountToggle(){
    const header = document.querySelector(".site-header");
    if(!header) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.addEventListener("click", ()=>{
      const next = document.documentElement.dataset.theme === DARK ? "light" : DARK;
      applyTheme(next);
      setStoredTheme(next);
      syncButton(button);
    });
    syncButton(button);

    const nav = header.querySelector(".top-nav");
    if(nav){
      nav.appendChild(button);
      return;
    }
    header.appendChild(button);
  }

  applyTheme(getStoredTheme());
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", mountToggle);
  }else{
    mountToggle();
  }
})();
