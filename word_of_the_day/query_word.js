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
  document.getElementById("kanjisentence_container").innerHTML = csvRow[8] + "<br \\>" + "<br \\>";
}

function fillEnglishElements(csvRow){
  document.getElementById("englishword_container").innerHTML = csvRow[4];
  document.getElementById("englishsentence_container").innerHTML = csvRow[11] + "<br \\>" + "<br \\>";
}

function fillFuriganaElements(csvRow){
  document.getElementById("furiganaword_container").innerHTML = csvRow[3];
  document.getElementById("furiganasentence_container").innerHTML = csvRow[10] + "<br \\>" + "<br \\>";
}

function clearEnglishElements(){
  document.getElementById("englishword_container").innerHTML = "";
  document.getElementById("englishsentence_container").innerHTML = "";
}

function clearFuriganaElements(){
  document.getElementById("furiganaword_container").innerHTML = "";
  document.getElementById("furiganasentence_container").innerHTML = "";
}

function fillFullDate() {
  var day = new Date(days_since_epoch * 86400 * 1000)
  var monthNames = [ "January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December" ];
  var weekdayNames = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", 
                         "Saturday" ];
  var month = monthNames[day.getMonth()];
  var date = day.getDate();
  var weekday = weekdayNames[day.getDay()];
  document.getElementById("fulldate_container").innerHTML = weekday + ", " + month + " " + String(date);
}

function myFunction(){
  // some random csv I found...
  var uri = "./japanese_core_2000.csv";

  console.log("fetching csv data...");
  $.get(uri, function(data){
    csvRows = data.split("\n")
    csvRows.pop()
    // add the timezone offset to get a number which switches at 00:00 in the current zone
    csvRow = getRandomRowOfTheDay(csvRows, days_since_epoch - (now.getTimezoneOffset() / 60 / 24));
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
  fillFullDate();
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

function previousDay() {
  days_since_epoch = days_since_epoch - 1;
  revealLevel = 0;
  myFunction();
}

