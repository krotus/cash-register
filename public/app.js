// Cargar productos al inicio
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
});

const btnAgregarProducto = document.getElementById('btnAgregarProducto');
btnAgregarProducto.addEventListener('click', async () => {
    const nombre = document.getElementById('nombreProducto').value;
    const precio = document.getElementById('precioProducto').value;

    if (!nombre || !precio) {
        alert('Completa nombre y precio.');
        return;
    }

    // Petición POST para crear producto
    const resp = await fetch('/api/productos', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({nombre, precio})
    });
    const nuevoProducto = await resp.json();
    console.log('Producto creado:', nuevoProducto);

    // Limpiar campos
    document.getElementById('nombreProducto').value = '';
    document.getElementById('precioProducto').value = '';

    // Recargar lista de productos
    cargarProductos();
});

// Cargar productos y mostrarlos en la página
async function cargarProductos() {
    const resp = await fetch('/api/productos');
    const productos = await resp.json();

    const contenedor = document.getElementById('listaProductos');
    contenedor.innerHTML = ''; // Limpia el contenedor antes de repintar

    productos.forEach(prod => {
        // Crearemos una card de Bootstrap
        const card = document.createElement('div');
        card.classList.add('col'); // Cada card estará en una "col" del grid

        // Imagen: si no existe prod.imagen, podrías poner una por defecto
        const rutaImagen = prod.imagen ? prod.imagen : 'img/producto_generico.png';

        card.innerHTML = `
      <div class="card h-100 text-center">
        <img src="${rutaImagen}" class="card-img-top" alt="${prod.nombre}" style="height: 120px; object-fit: cover;" />
        <div class="card-body d-flex flex-column justify-content-between">
          <h5 class="card-title">${prod.nombre}</h5>
          <p class="card-text fw-bold">$${prod.precio.toFixed(2)}</p>
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-danger btnMinus" data-id="${prod.id}">-</button>
            <span class="mx-2 fs-5" id="cant-${prod.id}">0</span>
            <button class="btn btn-sm btn-outline-success btnPlus" data-id="${prod.id}">+</button>
          </div>
        </div>
      </div>
    `;
        contenedor.appendChild(card);
    });

    // Asigna eventos a los botones + y -
    document.querySelectorAll('.btnPlus').forEach(btn => {
        btn.addEventListener('click', e => {
            const idProducto = e.target.dataset.id;
            aumentarCantidad(idProducto);
        });
    });
    document.querySelectorAll('.btnMinus').forEach(btn => {
        btn.addEventListener('click', e => {
            const idProducto = e.target.dataset.id;
            disminuirCantidad(idProducto);
        });
    });
}

// Mantenemos un objeto en memoria para saber cuántas unidades de cada producto hay seleccionadas
let cantidadesSeleccionadas = {}; // { <idProducto>: cantidad }

function aumentarCantidad(idProducto) {
    if (!cantidadesSeleccionadas[idProducto]) {
        cantidadesSeleccionadas[idProducto] = 0;
    }
    cantidadesSeleccionadas[idProducto]++;
    document.getElementById(`cant-${idProducto}`).textContent = cantidadesSeleccionadas[idProducto];
    calcularTotales();
}

function disminuirCantidad(idProducto) {
    if (!cantidadesSeleccionadas[idProducto]) {
        cantidadesSeleccionadas[idProducto] = 0;
    }
    if (cantidadesSeleccionadas[idProducto] > 0) {
        cantidadesSeleccionadas[idProducto]--;
    }
    document.getElementById(`cant-${idProducto}`).textContent = cantidadesSeleccionadas[idProducto];
    calcularTotales();
}

// Calcular total y cambio
const btnCalcularCambio = document.getElementById('btnCalcularCambio');
btnCalcularCambio.addEventListener('click', () => {
    calcularTotales();
});

function calcularTotales() {
    // Obtener lista de productos
    // Revisamos inputs del contenedor 'listaProductos'
    const contenedor = document.getElementById('listaProductos');
    const inputs = contenedor.querySelectorAll('input[type="number"]');

    let total = 0;
    inputs.forEach(input => {
        const cantidad = parseInt(input.value);
        if (cantidad > 0) {
            // "id" del input es "cant-<idProducto>"
            const idProducto = input.id.split('-')[1];
            // Necesitamos obtener el precio (podríamos guardarlo en data-* o en un map)
            // Para simplificar, podemos volver a la API, o almacenar precios en local:
            // Para una demo simple, aprovecho dataset:
        }
    });

    // Para no complicar el ejemplo, asumimos que cada div es:
    //   <input id="cant-ID" value="CANTIDAD"/> NOMBRE - $PRECIO
    // Podemos parsear la parte de precio:
    let index = 0;
    for (const child of contenedor.children) {
        // child.innerText podría ser "0 Nombre - $10"
        const input = child.querySelector('input');
        const cantidad = parseInt(input.value);
        if (cantidad > 0) {
            const texto = child.innerText;
            const precioStr = texto.split('$')[1];
            const precio = parseFloat(precioStr);
            total += cantidad * precio;
        }
        index++;
    }

    document.getElementById('totalPedido').innerText = total.toFixed(2);

    const importeEntregado = parseFloat(document.getElementById('importeEntregado').value) || 0;
    let cambio = 0;
    if (importeEntregado >= total) {
        cambio = importeEntregado - total;
    }
    document.getElementById('cambio').innerText = cambio.toFixed(2);
}

// Registrar pedido
const btnRegistrarPedido = document.getElementById('btnRegistrarPedido');
btnRegistrarPedido.addEventListener('click', async () => {
    // Primero calculamos totales
    calcularTotales();

    const total = parseFloat(document.getElementById('totalPedido').innerText);
    const metodoPago = document.getElementById('metodoPago').value;
    const importeEntregado = parseFloat(document.getElementById('importeEntregado').value) || 0;
    const cambio = parseFloat(document.getElementById('cambio').innerText);

    // Obtener la lista de productos seleccionados con sus cantidades
    const contenedor = document.getElementById('listaProductos');
    const inputs = contenedor.querySelectorAll('input[type="number"]');

    let listaProductos = [];
    inputs.forEach(input => {
        const cantidad = parseInt(input.value);
        if (cantidad > 0) {
            const texto = input.parentNode.innerText;
            const nombreProducto = texto.split('-')[0].replace(/[0-9]/g, '').trim(); // no muy robusto, pero sirve
            const precioStr = texto.split('$')[1];
            const precio = parseFloat(precioStr);
            listaProductos.push({
                nombre: nombreProducto,
                cantidad,
                precio
            });
        }
    });

    const pedido = {
        productos: listaProductos,
        total,
        metodoPago,
        importeEntregado,
        cambio
    };

    // Petición POST para registrar pedido
    const resp = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(pedido)
    });
    const data = await resp.json();

    alert('Pedido registrado con éxito: ' + data.id);

    // Reiniciar campos
    document.getElementById('importeEntregado').value = '';
    document.getElementById('cambio').innerText = '';
    document.getElementById('totalPedido').innerText = '0';
    inputs.forEach(i => i.value = 0);
});

// Mostrar historial
const btnCargarHistorial = document.getElementById('btnCargarHistorial');
btnCargarHistorial.addEventListener('click', async () => {
    const resp = await fetch('/api/pedidos');
    const pedidos = await resp.json();

    const contenedor = document.getElementById('historialPedidos');
    contenedor.innerHTML = '';

    pedidos.forEach(pedido => {
        const div = document.createElement('div');
        div.innerHTML = `
      <hr/>
      <p><strong>ID Pedido:</strong> ${pedido.id}</p>
      <p><strong>Fecha:</strong> ${pedido.fecha}</p>
      <p><strong>Productos:</strong></p>
      <ul>
        ${pedido.productos.map(p =>
            `<li>${p.nombre} x ${p.cantidad} = $${(p.cantidad * p.precio).toFixed(2)}</li>`
        ).join('')}
      </ul>
      <p><strong>Total:</strong> $${pedido.total.toFixed(2)}</p>
      <p><strong>Método de Pago:</strong> ${pedido.metodoPago}</p>
      <p><strong>Importe Entregado:</strong> $${pedido.importeEntregado.toFixed(2)}</p>
      <p><strong>Cambio:</strong> $${pedido.cambio.toFixed(2)}</p>
    `;
        contenedor.appendChild(div);
    });
});
