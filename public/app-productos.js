document.addEventListener('DOMContentLoaded', () => {
    // Listeners iniciales
    document
        .getElementById('btnCrearProducto')
        .addEventListener('click', crearProducto);

    document
        .getElementById('btnCargarProductos')
        .addEventListener('click', cargarProductos);
});

// Crear producto
async function crearProducto() {
    const nombre = document.getElementById('nombreProducto').value.trim();
    const precio = parseFloat(document.getElementById('precioProducto').value);

    if (!nombre || isNaN(precio)) {
        alert('Completa los campos correctamente.');
        return;
    }

    const resp = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, precio })
    });
    if (!resp.ok) {
        alert('Error creando producto.');
        return;
    }
    alert('Producto creado con éxito!');
    document.getElementById('nombreProducto').value = '';
    document.getElementById('precioProducto').value = '';

    // Opcional: recargar la tabla
    cargarProductos();
}

// Cargar productos a la tabla
async function cargarProductos() {
    const resp = await fetch('/api/productos');
    const productos = await resp.json();

    const tbody = document
        .getElementById('tablaProductos')
        .querySelector('tbody');
    tbody.innerHTML = '';

    productos.forEach((prod) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
      <td>${prod.id}</td>
      <td>${prod.nombre}</td>
      <td>$${prod.precio.toFixed(2)}</td>
      <td>
        <button class="btn btn-sm btn-warning btnEditar" data-id="${prod.id}">
          Editar
        </button>
        <button class="btn btn-sm btn-danger btnBorrar" data-id="${prod.id}">
          Borrar
        </button>
      </td>
    `;
        tbody.appendChild(tr);
    });

    // Asignar eventos a los botones "Editar" y "Borrar"
    document.querySelectorAll('.btnEditar').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            editarProducto(id);
        });
    });
    document.querySelectorAll('.btnBorrar').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            borrarProducto(id);
        });
    });
}

// Editar producto (versión simple con prompt)
async function editarProducto(id) {
    const nuevoNombre = prompt('Nuevo nombre del producto:');
    if (!nuevoNombre) return;

    const nuevoPrecioStr = prompt('Nuevo precio:');
    const nuevoPrecio = parseFloat(nuevoPrecioStr);
    if (isNaN(nuevoPrecio)) {
        alert('Precio inválido.');
        return;
    }

    const resp = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre: nuevoNombre,
            precio: nuevoPrecio
        })
    });
    if (!resp.ok) {
        alert('Error actualizando producto.');
        return;
    }
    alert('Producto actualizado con éxito.');
    cargarProductos();
}

// Borrar producto
async function borrarProducto(id) {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) {
        return;
    }
    const resp = await fetch(`/api/productos/${id}`, {
        method: 'DELETE'
    });
    if (!resp.ok) {
        alert('Error eliminando producto.');
        return;
    }
    alert('Producto eliminado.');
    cargarProductos();
}
