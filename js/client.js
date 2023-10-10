const domain = "https://api.digi-frontier.com";
let socket;
let storedImageUrls = [];

// Asset Loading
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
  ["input", "visualize", "contact"].forEach((id) => {
    document.getElementById(id).style.display =
      id === pageId ? "inline" : "none";
  });
};

const displayMessage = (data) => {
  Toastify({
    text: data.message,
    duration: data.success ? 10000 : 3000,
    destination: "https://github.com/apvarun/toastify-js",
    newWindow: true,
    close: true,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    style: { background: data.success ? "#6cc070" : "#cc0000" },
    onClick: () => {},
  }).showToast();
};

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
  const inputImageElement = document.getElementById("inputImage");

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
    const imageFile = document.getElementById("inputImage").files[0];
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

    const reader = new FileReader();
    reader.onload = () => {
      const imageBase64 = reader.result;
      const dataToSend = {
        image: imageBase64,
        exterior: exterior,
        token: token,
        organization: organization,
        color: color,
      };

      startGeneration(dataToSend);
      showPage("visualize");
    };
    reader.readAsDataURL(imageFile);
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

function addContactButtonListener() {
  document
    .getElementById("contactButton")
    .addEventListener("click", function (event) {
      event.preventDefault();
      submitContactForm();
    });
}

function displayInputImage(imageFile) {
  const imagesContainer = document.getElementById("inputImagesContainer");
  imagesContainer.innerHTML = "";
  const reader = new FileReader();

  reader.onload = (event) => {
    const inputImageSrc = event.target.result;
    const inputImg = document.createElement("img");
    inputImg.src = inputImageSrc;
    inputImg.alt = "Input Image";

    imagesContainer.appendChild(inputImg);
  };

  reader.readAsDataURL(imageFile);
}

const getOptions = async () => {
  $.ajax({
    url: `http://${domain}/api/getInfo`,
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

      socket = io(`ws://${domain}`);
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

  socket.on("error", (errorMessage) => {
    console.error("Error:", errorMessage);
  });
}

function contactEvent() {
  socket.emit(
    "connectEvent",
    JSON.stringify({ organization: organizationGlobal, token: tokenGlobal })
  );

  socket.on("error", (errorMessage) => {
    console.error("Error:", errorMessage);
  });
}

function startGeneration(data) {
  socket.emit("generate", JSON.stringify(data));
  const imagesContainer = document.getElementById("outputImages");
  imagesContainer.innerHTML = "";
  document.getElementById("generating-loader").style.display = "flex";

  socket.on("generationCompleted", (output) => {
    console.log("Generation completed:", output);
    displayMessage({
      success: true,
      message: "Generation completed.",
    });
    displayImages(output);
  });

  socket.on("error", (errorMessage) => {
    console.error("Error:", errorMessage);
    displayMessage({
      success: false,
      message: errorMessage,
    });
    showPage("input");
  });
}

function submitContactForm() {
  // Get the values from the form fields
  const firstName = document.getElementById("fname").value;
  const lastName = document.getElementById("lname").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const zip = document.getElementById("zip").value;
  const question = document.getElementById("question").value;

  // Create the data object
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
  };

  // Emit the data
  socket.emit("contactSubmission", JSON.stringify(data));

  // Handle the response from the server (if any)
  socket.on("contactComplete", (output) => {
    console.log("Submission completed:", output);
    displayMessage({
      success: true,
      message: output,
    });
  });

  socket.on("error", (errorMessage) => {
    console.error("Error:", errorMessage);
    displayMessage({
      success: false,
      message: errorMessage,
    });
  });
}

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
    const closeBtns = document.getElementsByClassName("close");

    for (const closeBtn of closeBtns) {
      closeBtn.addEventListener("click", () => closeModal(modal));
    }
    modal.addEventListener("click", () => closeModal(modal));

    modalBody.addEventListener("click", (e) => e.stopPropagation());

    button.addEventListener("click", () => toggleModal(modal));

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
            addContactButtonListener();
            await getOptions();
            modalService();
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
