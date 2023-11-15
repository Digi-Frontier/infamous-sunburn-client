const domain = "api.digi-frontier.com";
let socket;
let storedImageUrls = [];
let socketInitialized = false;
const progressDuration = 180000;
let progressBarAnimId;

const loadAsset = async (type, url, callback) => {
  const head = document.querySelector("head");
  let element;

  if (type === "script") {
    element = document.createElement("script");
    element.type = "text/javascript";
    element.src = url;
    if (callback) element.onload = callback;
  } else if (type === "css") {
    element = document.createElement("link");
    element.type = "text/css";
    element.href = url;
  }

  if (element) head.appendChild(element);
};

// UI Helpers
const getRandomNumber = () => Math.floor(Math.random() * 900000) + 100000;

const showPage = (pageId) => {
  ["instruct", "input", "visualize", "contact", "thankYou", "initialEmail"].forEach((id) => {
    document.getElementById(id).style.display =
      id === pageId ? "inline" : "none";
  });
};

const displayMessage = (data) => {
  Toastify({
    text: data.message,
    duration: data.success ? 10000 : 3000,
    newWindow: true,
    close: true,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    style: { background: data.success ? "#6cc070" : "#cc0000" },
    onClick: () => {},
  }).showToast();
};

let animationId;
let processCompleted = false;

async function updateProgressBar(duration, finished) {
  if (finished) {
    cancelAnimationFrame(animationId);
    const progressBar = document.getElementById("progress-bar");

    progressBar.style.width = "100%";
    document.getElementById("progress-text").textContent = "100%";
    return;
  }

  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const startTime = Date.now();

  function step() {
    if (finished) {
      return;
    }

    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(1, elapsedTime / duration) * 100;

    progressBar.style.width = progress + "%";
    progressText.textContent = progress.toFixed(1) + "%";

    if (progress < 100) {
      animationId = requestAnimationFrame(step);
    }
  }
  animationId = requestAnimationFrame(step);
}

const populateExteriorOptions = (elementId, options) => {
  const select = document.getElementById(elementId);
  options.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    select.appendChild(option);
  });
};

function addInputImageEventListener() {
  const inputImageElement = document.getElementById("imageInput");

  if (inputImageElement) {
    inputImageElement.addEventListener("change", (event) => {
      const selectedImage = event.target.files[0];
      if (selectedImage) {
        document.querySelector(".upload-box-main-txt").style.display = "none";
        document.querySelector(".upload-box-small-txt").style.display = "none";

        displayInputImage(selectedImage);
      }
    });
  }
}

function addVisualizeButtonListener() {
  document.getElementById("visualizeButton").addEventListener("click", () => {
    const imageFile = document.getElementById("inputImage");
    const exterior = document.getElementById("exterior").value;
    const color = document.getElementById("color").value;
    const token = tokenGlobal;
    const organization = organizationGlobal;

    if (!imageFile) {
      console.error("Please select an image.");

      displayMessage({
        success: false,
        message: "Please select an image.",
      });
      return;
    }
    const dataToSend = {
      image: imageFile.src,
      exterior: exterior,
      token: token,
      organization: organization,
      color: color,
    };
    startGeneration(dataToSend);
    showPage("visualize");
    updateProgressBar(progressDuration);
  });
}

function addInitializeButtonListener() {
  document.getElementById("initializeButton").addEventListener("click", () => {
    initializeEvent();
  });
}

function addConnectionButtonListener() {
  document.getElementById("connectButton").addEventListener("click", () => {
    contactEvent();
  });
}
function validateEmail(event){
  event.preventDefault();
  const form = document.getElementById("storeEmailForm");
  if (form.checkValidity()) {
    const email = document.getElementById("email").value;
    const data = {
      organization: organizationGlobal,
      token: tokenGlobal,
      email: email,
    };
    socket.emit("storeEmail", JSON.stringify(data));
    return true;
  } else {
    return false;
  }
}
function validateContact(event) {
  event.preventDefault();
  const form = document.getElementById("emailForm");
  if (form.checkValidity()) {
    const firstName = document.getElementById("fname").value;
    const lastName = document.getElementById("lname").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const zip = document.getElementById("zip").value;
    const question = document.getElementById("question").value;
    const imageFile = document.getElementById("inputImage");

    const data = {
      organization: organizationGlobal,
      token: tokenGlobal,
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      zip: zip,
      question: question,
      images: storedImageUrls,
      inputImage: imageFile.src,
    };

    socket.emit("contactSubmission", JSON.stringify(data));
    showPage("thankYou");

    return true;
  } else {
    return false;
  }
}
function displayInputImage(imageFile) {
  const imagesContainer = document.getElementById("inputImagesContainer");
  imagesContainer.innerHTML = "";
  const reader = new FileReader();

  reader.onload = (event) => {
    const inputImageSrc = event.target.result;
    const inputImg = document.createElement("img");
    const maxSize = 1024;
    const imageElement = new Image();
    imageElement.src = inputImageSrc;
    imageElement.onload = () => {
      let width = imageElement.width;
      let height = imageElement.height;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height *= maxSize / width;
          width = maxSize;
        } else {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imageElement, 0, 0, width, height);
      const resizedImageSrc = canvas.toDataURL("image/png");

      // Preload the resized image
      const resizedImage = new Image();
      resizedImage.src = resizedImageSrc;
      resizedImage.onload = () => {
        inputImg.src = resizedImage.src;
        inputImg.alt = "Input Image";
        inputImg.id = "inputImage";
        inputImg.loading = "eager";
        imagesContainer.appendChild(inputImg);
      };
    };
  };
  reader.readAsDataURL(imageFile);
}

const getOptions = async () => {
  $.ajax({
    url: `https://${domain}/api/getInfo`,
    method: "GET",
    data: { organization: organizationGlobal },
    success: (response) => {
      if (response.status !== "success") {
        displayMessage({
          success: false,
          message: "Failed to fetch exterior options.",
        });
        return;
      }
      if (!socketInitialized) {
        socket = io(`wss://${domain}`, {
          withCredentials: true,
          transports: ["websocket"],
        });
        // Attach event listeners here
        socket.on("error", (errorMessage) => {
          console.error("Error:", errorMessage);
        });
        socket.on("generationCompleted", async (output) => {
          console.log("Generation completed:", output);
          await updateProgressBar(0, true);
          setTimeout(() => {
            displayMessage({
              success: true,
              message: "Generation complete.",
            });
            displayImages(output);
          }, 1000);
        });
        socket.on("generationError", (errorMessage) => {
          console.error("Error:", errorMessage);
          displayMessage({
            success: false,
            message: errorMessage,
          });
          showPage("input");
        });
        socket.on("contactError", (errorMessage) => {
          console.error("Error:", errorMessage);
          displayMessage({
            success: false,
            message: errorMessage,
          });
        });
        socket.on("emailError", (errorMessage) => {
          console.error("Error:", errorMessage);
          displayMessage({
            success: false,
            message: errorMessage,
          });
        });
        socket.on("storeEmailComplete", (message) => {
          console.log(message);
          showPage("instruct") 
        });
        socketInitialized = true;
      }

      populateExteriorOptions("exterior", response.data.wallType);
      populateExteriorOptions("color", response.data.colors);
    },
    error: () => {
      displayMessage({
        success: false,
        message: "Failed to fetch exterior options.",
      });
    },
  });
};

function displayImages(generatedImageUrls) {
  storedImageUrls = generatedImageUrls;

  const imagesContainer = document.getElementById("outputImages");
  imagesContainer.innerHTML = "";
  document.getElementById("generating-loader").style.display = "none";

  generatedImageUrls.forEach((imageUrl, index) => {
    const generatedImg = document.createElement("img");
    generatedImg.src = imageUrl;
    generatedImg.alt = "Generated Image";
    imagesContainer.appendChild(generatedImg);
  });
}

function initializeEvent() {
  socket.emit(
    "initializeEvent",
    JSON.stringify({ organization: organizationGlobal, token: tokenGlobal })
  );
}

function contactEvent() {
  socket.emit(
    "connectEvent",
    JSON.stringify({ organization: organizationGlobal, token: tokenGlobal })
  );
}

function startGeneration(data) {
  socket.emit("generate", JSON.stringify(data));

  const imagesContainer = document.getElementById("outputImages");
  imagesContainer.innerHTML = "";
  document.getElementById("generating-loader").style.display = "flex";
}

const urlModalTrigger = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const modalParam = urlParams.get("clientOpen");
  var event = new CustomEvent("urlTrigger");
  console.log("modalParam");

  if (modalParam == "true") {
    setTimeout(() => {
      document.dispatchEvent(event);
    }, "3000");
  }
};

const modalService = () => {
  const d = document;
  const body = d.querySelector("body");
  const modals = d.querySelectorAll("[data-modal]");

  // Attach click event to all modal triggers
  for (let modal of modals) {
    const trigger = modal.getAttribute("data-modal");
    const button = d.querySelector(`[data-modal-trigger="${trigger}"]`);
    if (button) {
      triggerEvent(button, modal);
    }
  }

  function triggerEvent(button, modal) {
    const modalBody = modal.querySelector(".modal-body");
    const closeBtns = document.getElementsByClassName("modal-close");

    for (const closeBtn of closeBtns) {
      closeBtn.addEventListener("click", () => closeModal(modal));
    }
    modal.addEventListener("click", () => closeModal(modal));

    modalBody.addEventListener("click", (e) => e.stopPropagation());

    button.addEventListener("click", () => toggleModal(modal));

    document.addEventListener("urlTrigger", () => toggleModal(modal));

    // Close modal when hitting escape
    body.addEventListener("keydown", (e) => {
      if (e.keyCode === 27) {
        closeModal(modal);
      }
    });
  }
  function toggleModal(modal) {
    modal.classList.toggle("is-open");
    $("body").css("overflow", "hidden");
  }

  function closeModal(modal) {
    modal.classList.remove("is-open");
    $("body").css("overflow", "auto");
  }
};

async function includeHTML() {
  var z, i, elmnt, file, xhttp;
  z = document.getElementsByTagName("*");
  for (i = 0; i < z.length; i++) {
    elmnt = z[i];
    file = elmnt.getAttribute("client-html");
    if (file) {
      xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = async function () {
        if (this.readyState == 4) {
          if (this.status == 200) {
            elmnt.innerHTML = this.responseText;
            addInputImageEventListener();
            addVisualizeButtonListener();
            addInitializeButtonListener();
            addConnectionButtonListener();
            await getOptions();
            modalService();
            urlModalTrigger();
          }
          if (this.status == 404) {
            console.log("Page not found.");
          }
          elmnt.removeAttribute("client-html");
          includeHTML();
        }
      };
      xhttp.open("GET", file, true);
      xhttp.send();
      return;
    }
  }
}

async function init() {
  await loadAsset(
    "css",
    "https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css"
  );
  await loadAsset(
    "script",
    "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"
  );
  await loadAsset(
    "script",
    "https://code.jquery.com/jquery-3.6.0.min.js",
    includeHTML
  );
  await loadAsset("script", "https://cdn.jsdelivr.net/npm/toastify-js");
}

init();
