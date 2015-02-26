var files = []

function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  files = evt.dataTransfer.files; // FileList object.

  // files is a FileList of File objects. List some properties.
  var output = [];
      metadata = [];
  for (var i = 0, file; file = files[i]; i++) {
    output.push('<li><strong>', escape(file.name), '</strong> (', file.type || 'n/a', ') - ',
                file.size, ' bytes, last modified: ',
                file.lastModifiedDate ? file.lastModifiedDate.toLocaleDateString() : 'n/a',
                '</li>');
    var metadaton = {"name":escape(file.name),
                     "size":file.size,
                     "type":file.type || 'n/a',
                     "crc" :""}
    metadata.push(metadaton)
  }
  document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
  var firebase = new Firebase("https://webdrop.firebaseio.com/");
  var id = createID()
  firebase.set({
    id : {
      "id" : id,
      "file_metadata" : metadata
    }
  })
}

function send() { // perhaps need params for peer id or something
  for (var i = 0, file; f = files[i]; i++) {
    for (var bytes = 0; bytes <= file.size; bytes += 1200) {
      endingByte = bytes+1200
      if (endingByte > file.size) {
        endingByte = file.size
      }
      var blob = file.slice(bytes, endingByte);
      // send blob
    }
  }
}

function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy';
}

function createID() {
  var timestamp = Date.now()
  var alphabet = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "a", "b", "c", "d", "e", "f", "g", "h", "i",
                  "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B",
                  "C", "D", "E", "F", "G", "H", "I", "K", "L", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X",
                  "Y", "Z"]
  var arr = []
  var base = alphabet.length
  while (timestamp > 0) {
    var rem = parseInt(timestamp % base)
    timestamp = parseInt(timestamp / base)
    arr.push(alphabet[rem])
  }
  arr = arr.reverse()
  id = arr.join("")
  // add two random characters to ensure uniqueness between identical milliseconds
  id += (alphabet[Math.floor(Math.random() * alphabet.length)])
  id += (alphabet[Math.floor(Math.random() * alphabet.length)])
  return id
}

var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
