const feedbackForm = document.getElementById("feedback-form");
const feedbackCategory = document.getElementById("feedback-category");
const feedbackName = document.getElementById("feedback-name");
const feedbackPage = document.getElementById("feedback-page");
const feedbackMessage = document.getElementById("feedback-message");
const feedbackSubmit = document.getElementById("feedback-submit");
const feedbackStatus = document.getElementById("feedback-status");

function initFeedback(){
  const referrer = getSameSiteReferrer();
  if(referrer) feedbackPage.value = referrer;
  feedbackForm.addEventListener("submit", submitFeedback);
}

function getSameSiteReferrer(){
  if(!document.referrer) return "";
  try{
    const referrer = new URL(document.referrer);
    if(referrer.origin !== window.location.origin) return "";
    return `${referrer.pathname}${referrer.search}`.slice(0, 300);
  }catch{
    return "";
  }
}

async function submitFeedback(event){
  event.preventDefault();
  const message = feedbackMessage.value.trim();
  if(message.length < 8){
    setFeedbackStatus("Add a little more detail before submitting.", "err");
    feedbackMessage.focus();
    return;
  }

  const config = window.LEADERBOARD_CONFIG || {};
  if(!config.feedbackFunctionUrl){
    setFeedbackStatus("Feedback is not configured yet.", "err");
    return;
  }

  feedbackSubmit.disabled = true;
  setFeedbackStatus("Submitting feedback...", "");

  try{
    const response = await fetch(config.feedbackFunctionUrl, {
      method: "POST",
      headers: getFeedbackHeaders(config),
      body: JSON.stringify({
        category: feedbackCategory.value,
        name: feedbackName.value,
        pageUrl: feedbackPage.value,
        referrer: getSameSiteReferrer(),
        message
      })
    });
    const text = await response.text();
    const payload = parseJson(text);
    if(!response.ok) throw new Error(getFeedbackError(payload, text, response.status));

    feedbackForm.reset();
    if(getSameSiteReferrer()) feedbackPage.value = getSameSiteReferrer();
    setFeedbackStatus("Feedback submitted. Thank you.", "ok");
  }catch(error){
    setFeedbackStatus(error.message || "Could not submit feedback.", "err");
  }finally{
    feedbackSubmit.disabled = false;
  }
}

function getFeedbackHeaders(config){
  const headers = {"Content-Type": "application/json"};
  if(config.supabaseAnonKey) headers.apikey = config.supabaseAnonKey;
  return headers;
}

function parseJson(text){
  try{
    return text ? JSON.parse(text) : {};
  }catch{
    return {};
  }
}

function getFeedbackError(payload, text, status){
  const raw = payload && payload.error ? String(payload.error) : text || "";
  return raw || `Feedback request failed (${status}).`;
}

function setFeedbackStatus(text, state){
  feedbackStatus.textContent = text;
  feedbackStatus.classList.toggle("ok", state === "ok");
  feedbackStatus.classList.toggle("err", state === "err");
}

document.addEventListener("DOMContentLoaded", initFeedback);
