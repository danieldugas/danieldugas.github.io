var csvRow = [];
var csvRows = []; // for debugging
var revealLevel = 0;
var now = new Date();
var seconds_since_epoch = now.getTime() / 1000;
var days_since_epoch = seconds_since_epoch / 86400;

function getRandomRowOfTheDay(allRows, days) {
  // assume length = 2007
  // we want a nice divisor of 2008 (this guarantees each loop ends at previous loop start + 1)
  // divisors(2008) = [1, 2, 4, 8, 251, 502, 1004]
  // we pick 251
  // result % 2007
  // [0, 251, 502, 753, 1004, 1255, 1506, 1757, 1, 252]
  return allRows[(Math.floor(days) * 251) % 2007].split("|");
}

function fillKanjiElements(csvRow){
  document.getElementById("kanjiword_container").innerHTML = csvRow[1];
  document.getElementById("kanjisentence_container").innerHTML = csvRow[8];
}

function fillEnglishElements(csvRow){
  document.getElementById("englishword_container").innerHTML = csvRow[4];
  document.getElementById("englishsentence_container").innerHTML = csvRow[11];
}

function fillFuriganaElements(csvRow){
  document.getElementById("furiganaword_container").innerHTML = csvRow[3];
  document.getElementById("furiganasentence_container").innerHTML = csvRow[10];
}

function clearEnglishElements(){
  document.getElementById("englishword_container").innerHTML = "";
  document.getElementById("englishsentence_container").innerHTML = "";
}

function clearFuriganaElements(){
  document.getElementById("furiganaword_container").innerHTML = "";
  document.getElementById("furiganasentence_container").innerHTML = "";
}

function myFunction(){
  // some random csv I found...
  var uri = "./japanese_core_2000.csv";

  console.log("fetching csv data...");
  $.get(uri, function(data){
    csvRows = data.split("\n")
    csvRows.pop()
    csvRow = getRandomRowOfTheDay(csvRows, days_since_epoch);
    updateElements()
  });

}

function revealTranslation(){
  switch(revealLevel) {
    case 0:
      revealLevel = 1;
      break;
    case 1:
      revealLevel = 2;
      break;
    case 2:
      revealLevel = 0;
      break;
    default:
      break;
  }
  updateElements()
}

function updateElements() {
  fillKanjiElements(csvRow);
  clearEnglishElements();
  clearFuriganaElements();
  switch(revealLevel) {
    case 0:
      document.getElementById("reveal_button").innerHTML = "Show furigana";
      break;
    case 1:
      fillFuriganaElements(csvRow);
      document.getElementById("reveal_button").innerHTML = "Show translation";
      break;
    case 2:
      fillFuriganaElements(csvRow);
      fillEnglishElements(csvRow);
      document.getElementById("reveal_button").innerHTML = "Hide";
      break;
    default:
      break;
  }
}

function advanceDay() {
  days_since_epoch = days_since_epoch + 1
  myFunction()
}
