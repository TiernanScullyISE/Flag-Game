/* Shared presentation helpers. Keep gameplay and submission rules in their own modules. */
window.QuizUI = (()=>{
  function formatTime(ms){
    const number = Number(ms);
    const value = Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
    const minutes = Math.floor(value / 60000);
    const seconds = Math.floor((value % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(value % 1000).padStart(3, "0")}`;
  }

  function createModal(modal, onDismiss){
    let previousFocus = null;
    let background = [];
    const dialog = modal.querySelector('[role="dialog"]');
    dialog.tabIndex = -1;
    const focusable = ()=>Array.from(dialog.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex="0"]'
    )).filter(element=>!element.disabled && !element.closest('[hidden], [inert]') && element.getClientRects().length);

    modal.addEventListener("keydown", event=>{
      if(event.key === "Escape"){
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }else if(event.key === "Tab"){
        const elements = focusable();
        const index = elements.indexOf(document.activeElement);
        if(!elements.length){
          event.preventDefault();
          dialog.focus();
        }else if(event.shiftKey && index <= 0){
          event.preventDefault();
          elements[elements.length - 1].focus();
        }else if(!event.shiftKey && (index === elements.length - 1 || index === -1)){
          event.preventDefault();
          elements[0].focus();
        }
      }
    });

    return {
      open(initialFocus){
        if(!modal.classList.contains("is-visible")){
          previousFocus = document.activeElement;
          background = Array.from(document.body.children)
            .filter(element=>element !== modal && !['SCRIPT', 'STYLE'].includes(element.tagName))
            .map(element=>({element, inert:element.inert}));
          background.forEach(({element})=>{ element.inert = true; });
        }
        modal.classList.add("is-visible");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        (initialFocus || focusable()[0] || dialog).focus({preventScroll:true});
      },
      close(){
        if(!modal.classList.contains("is-visible")) return;
        modal.classList.remove("is-visible");
        modal.setAttribute("aria-hidden", "true");
        background.forEach(({element, inert})=>{ element.inert = inert; });
        background = [];
        document.body.classList.remove("modal-open");
        if(previousFocus?.isConnected && !previousFocus.disabled){
          previousFocus.focus({preventScroll:true});
        }
        previousFocus = null;
      }
    };
  }
  return {formatTime, createModal};
})();
