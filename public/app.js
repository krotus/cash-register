// -----------------------------------------------------------------------------------
// VARIABLES GLOBALES
// -----------------------------------------------------------------------------------

/**
 * Almacena la lista de productos que recibimos del servidor.
 * Cada elemento es {id, nombre, precio, (imagen opcional)}
 */
let listaProductosGlobal = [];

/**
 * Objeto para llevar la cuenta de cuántas unidades de cada producto (por ID)
 * se han seleccionado en el pedido actual.
 * Ej: cantidadesSeleccionadas = { "1": 2, "2": 5 }
 */
let cantidadesSeleccionadas = {};

// -----------------------------------------------------------------------------------
// EVENTOS INICIALES
// -----------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Al cargar la página, traemos la lista de productos
    cargarProductos();
});

// -----------------------------------------------------------------------------------
// CREACIÓN DE NUEVOS PRODUCTOS
// -----------------------------------------------------------------------------------

const btnAgregarProducto = document.getElementById('btnAgregarProducto');
btnAgregarProducto.addEventListener('click', async () => {
    const nombre = document.getElementById('nombreProducto').value.trim();
    const precio = parseFloat(document.getElementById('precioProducto').value);

    if (!nombre || isNaN(precio)) {
        alert('Completa nombre y precio correctamente.');
        return;
    }

    // Petición POST para crear producto
    const resp = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, precio })
    });
    const nuevoProducto = await resp.json();
    console.log('Producto creado:', nuevoProducto);

    // Limpiar campos de entrada
    document.getElementById('nombreProducto').value = '';
    document.getElementById('precioProducto').value = '';

    // Volver a cargar la lista de productos (para que aparezca el recién creado)
    cargarProductos();
});

// -----------------------------------------------------------------------------------
// CARGAR PRODUCTOS (Y MOSTRARLOS COMO CARDS)
// -----------------------------------------------------------------------------------

async function cargarProductos() {
    const resp = await fetch('/api/productos');
    listaProductosGlobal = await resp.json(); // Guardamos la lista en la variable global

    const contenedor = document.getElementById('listaProductos');
    contenedor.innerHTML = ''; // Limpia el contenedor antes de repintar

    listaProductosGlobal.forEach((prod) => {
        // Crearemos una card de Bootstrap
        const card = document.createElement('div');
        card.classList.add('col'); // Cada card estará en una "col" del grid

        // Usa la imagen si existe; si no, pon una genérica
        const rutaImagen = prod.imagen ? prod.imagen : 'img/producto_generico.png';

        card.innerHTML = `
      <div class="card h-100 text-center">
        <div class="card-body d-flex flex-column justify-content-center align-items-center">
          <h5 class="card-title fs-4">${prod.nombre}</h5>
          <p class="card-text fs-5 fw-bold">€${prod.precio.toFixed(2)}</p>
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

    // Ahora asignamos eventos a los botones + y -
    document.querySelectorAll('.btnPlus').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const idProducto = e.target.dataset.id;
            aumentarCantidad(idProducto);
        });
    });
    document.querySelectorAll('.btnMinus').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const idProducto = e.target.dataset.id;
            disminuirCantidad(idProducto);
        });
    });
}

// -----------------------------------------------------------------------------------
// FUNCIONES PARA MODIFICAR CANTIDADES
// -----------------------------------------------------------------------------------

function aumentarCantidad(idProducto) {
    if (!cantidadesSeleccionadas[idProducto]) {
        cantidadesSeleccionadas[idProducto] = 0;
    }
    cantidadesSeleccionadas[idProducto]++;
    document.getElementById(`cant-${idProducto}`).textContent =
        cantidadesSeleccionadas[idProducto];
    calcularTotales();
}

function disminuirCantidad(idProducto) {
    if (!cantidadesSeleccionadas[idProducto]) {
        cantidadesSeleccionadas[idProducto] = 0;
    }
    if (cantidadesSeleccionadas[idProducto] > 0) {
        cantidadesSeleccionadas[idProducto]--;
    }
    document.getElementById(`cant-${idProducto}`).textContent =
        cantidadesSeleccionadas[idProducto];
    calcularTotales();
}

// -----------------------------------------------------------------------------------
// CÁLCULO DE TOTALES Y CAMBIO
// -----------------------------------------------------------------------------------

const btnCalcularCambio = document.getElementById('btnCalcularCambio');
btnCalcularCambio.addEventListener('click', () => {
    calcularTotales();
});

function calcularTotales() {
    let total = 0;

    // Recorremos el objeto cantidadesSeleccionadas para obtener (precio * cantidad)
    for (const id in cantidadesSeleccionadas) {
        const cantidad = cantidadesSeleccionadas[id];
        if (cantidad > 0) {
            // Busca el producto en listaProductosGlobal
            const prod = listaProductosGlobal.find((p) => p.id == id);
            if (prod) {
                total += prod.precio * cantidad;
            }
        }
    }

    // Actualizamos el texto del total
    document.getElementById('totalPedido').innerText = total.toFixed(2);

    // Calculamos el cambio en base al importe entregado
    const importeEntregado =
        parseFloat(document.getElementById('importeEntregado').value) || 0;
    let cambio = 0;
    if (importeEntregado >= total) {
        cambio = importeEntregado - total;
    }
    document.getElementById('cambio').innerText = cambio.toFixed(2);
}

// -----------------------------------------------------------------------------------
// REGISTRAR PEDIDO
// -----------------------------------------------------------------------------------

const btnRegistrarPedido = document.getElementById('btnRegistrarPedido');
btnRegistrarPedido.addEventListener('click', async () => {
    // Antes de registrar, recalculamos totales para estar seguros
    calcularTotales();

    const total = parseFloat(document.getElementById('totalPedido').innerText);
    const metodoPago = document.getElementById('metodoPago').value;
    const importeEntregado =
        parseFloat(document.getElementById('importeEntregado').value) || 0;
    const cambio = parseFloat(document.getElementById('cambio').innerText);

    // Construimos la lista de productos seleccionados (con cantidad > 0)
    let listaProductos = [];
    for (const id in cantidadesSeleccionadas) {
        const cantidad = cantidadesSeleccionadas[id];
        if (cantidad > 0) {
            const prod = listaProductosGlobal.find((p) => p.id == id);
            if (prod) {
                listaProductos.push({
                    id: prod.id,
                    nombre: prod.nombre,
                    cantidad,
                    precio: prod.precio
                });
            }
        }
    }

    // Estructuramos el pedido
    const pedido = {
        productos: listaProductos,
        total,
        metodoPago,
        importeEntregado,
        cambio
    };

    // Petición POST al backend
    const resp = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido)
    });
    const data = await resp.json();

    alert('Pedido registrado con éxito: ' + data.id);

    // Limpiar cantidades y campos
    cantidadesSeleccionadas = {};
    listaProductosGlobal.forEach((p) => {
        const span = document.getElementById(`cant-${p.id}`);
        if (span) {
            span.textContent = '0';
        }
    });
    document.getElementById('importeEntregado').value = '';
    document.getElementById('cambio').innerText = '0';
    document.getElementById('totalPedido').innerText = '0';
});

// -----------------------------------------------------------------------------------
// MOSTRAR HISTORIAL
// -----------------------------------------------------------------------------------

const btnCargarHistorial = document.getElementById('btnCargarHistorial');
btnCargarHistorial.addEventListener('click', async () => {
    const resp = await fetch('/api/pedidos');
    const pedidos = await resp.json();

    const contenedor = document.getElementById('historialPedidos');
    contenedor.innerHTML = '';

    pedidos.forEach((pedido) => {
        const div = document.createElement('div');
        div.innerHTML = `
      <hr/>
      <p><strong>ID Pedido:</strong> ${pedido.id}</p>
      <p><strong>Fecha:</strong> ${pedido.fecha}</p>
      <p><strong>Productos:</strong></p>
      <ul>
        ${pedido.productos
            .map(
                (p) =>
                    `<li>${p.nombre} x ${p.cantidad} = €${(
                        p.cantidad * p.precio
                    ).toFixed(2)}</li>`
            )
            .join('')}
      </ul>
      <p><strong>Total:</strong> €${pedido.total.toFixed(2)}</p>
      <p><strong>Método de Pago:</strong> ${pedido.metodoPago}</p>
      <p><strong>Importe Entregado:</strong> €${pedido.importeEntregado.toFixed(
            2
        )}</p>
      <p><strong>Cambio:</strong> €${pedido.cambio.toFixed(2)}</p>
    `;
        contenedor.appendChild(div);
    });
});


// -----------------------------------------------------------------------------------
// BOTÓN LIMPIAR
// -----------------------------------------------------------------------------------
document.getElementById('btnLimpiar').addEventListener('click', () => {
    cantidadesSeleccionadas = {};
    listaProductosGlobal.forEach((p) => {
        const span = document.getElementById(`cant-${p.id}`);
        if (span) span.textContent = '0';
    });
    document.getElementById('totalPedido').textContent = '0.00';
    document.getElementById('cambio').textContent = '0';
    document.getElementById('importeEntregado').value = '';
});