module.exports.cambioMoneda=(numero)=> {
    cif = 3, dec = 2
    // tomamos el valor que tiene el input
    let inputNum = numero;
    // Lo convertimos en texto
    inputNum = inputNum.toString()
    // separamos en un array los valores antes y después del punto
    inputNum = inputNum.split('.')
    // evaluamos si existen decimales
    if (!inputNum[1]) {
      inputNum[1] = '00'
    }
  
    let separados
    // se calcula la longitud de la cadena
    if (inputNum[0].length > cif) {
      let uno = inputNum[0].length % cif
      if (uno === 0) {
        separados = []
      } else {
        separados = [inputNum[0].substring(0, uno)]
      }
      let posiciones = parseInt(inputNum[0].length / cif)
      for (let i = 0; i < posiciones; i++) {
        let pos = ((i * cif) + uno)
        //console.log(uno, pos)
        separados.push(inputNum[0].substring(pos, (pos + 3)))
      }
    } else {
      separados = [inputNum[0]]
    }
  
    //document.getElementById('monedaInput').value = '$' + separados.join(',') + '.' + inputNum[1]
    //console.log();
    return '$ ' + separados.join(',') + '.' + inputNum[1];
  };