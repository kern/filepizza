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
  // post metadata to server
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

var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
