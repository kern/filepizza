export default function(name, blob) {
  var reader = new FileReader();

  reader.onloadend = function() {
    var link = document.createElement('a');
    link.download = name;
    link.href = reader.result;
    link.click();
  };

  reader.readAsDataURL(blob);
}
