/* ===== Contributors Typing Animation ===== */
const contributors = [
  "Kailash Rooj: Backend Developer",
  "Abhishek Banerjee: Backend Developer",
  "Rajesh Paul: Frontend Developer",
  "Arunima Pal: Frontend Developer",
];
const contributorColors = ["#39FF14", "#00FFFF", "#FF6EC7", "#FFD700"];
let element;
let currentNameIndex = 0;
let currentCharIndex = 0;
const typingSpeed = 100;
const pauseBetweenNames = 1500;

function typeContributor() {
  element.style.color = contributorColors[currentNameIndex];
  element.style.textShadow = `0 0 8px ${contributorColors[currentNameIndex]}, 0 0 20px ${contributorColors[currentNameIndex]}`;
  if (currentCharIndex < contributors[currentNameIndex].length) {
    element.textContent += contributors[currentNameIndex].charAt(currentCharIndex);
    currentCharIndex++;
    setTimeout(typeContributor, typingSpeed);
  } else {
    setTimeout(eraseContributor, pauseBetweenNames);
  }
}

function eraseContributor() {
  if (currentCharIndex > 0) {
    element.textContent = contributors[currentNameIndex].substring(0, currentCharIndex - 1);
    currentCharIndex--;
    setTimeout(eraseContributor, typingSpeed / 2);
  } else {
    currentNameIndex = (currentNameIndex + 1) % contributors.length;
    setTimeout(typeContributor, typingSpeed);
  }
}

/* ===== Initialize ===== */
document.addEventListener("DOMContentLoaded", () => {
  element = document.getElementById("contributors");
  if (element) typeContributor();
  listFiles("");
})