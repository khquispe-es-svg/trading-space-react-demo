import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  createProduct,
  deleteProduct,
  fetchProductImeis,
  fetchProducts,
  findExistingImeis,
  updateProduct,
  validateProductImageFile,
} from './productService.js'
import {
  normalizeProductFieldInput,
  validateProductBrand,
  validateProductModel,
} from './productFormUtils.js'

const Phone3DViewer = lazy(() => import('./Phone3DViewer.jsx'))
const localProductImageModules = import.meta.glob(
  '../../../imagenes/productos/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true, import: 'default' },
)
const localProductImages = Object.entries(localProductImageModules)
  .map(([path, url]) => {
    const normalizedPath = path.replaceAll('\\', '/')
    return {
      path: normalizedPath,
      reference: normalizedPath.replace(/^(?:\.\.\/){3}/, ''),
      url,
    }
  })
  .sort((left, right) => left.path.localeCompare(right.path))

function resolveProjectImage(reference) {
  const normalizedReference = String(reference ?? '').replaceAll('\\', '/')
  if (!normalizedReference) return null

  return localProductImages.find(
    (image) =>
      image.reference === normalizedReference ||
      image.path === normalizedReference ||
      image.url === normalizedReference,
  ) ?? null
}

const productChoiceOptions = {
  ram: ['4GB', '6GB', '8GB', '12GB', '16GB', '24GB'],
  almacenamiento: ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'],
}
const editableFields = [
  { name: 'marca', label: 'Marca', type: 'brand' },
  { name: 'modelo', label: 'Modelo', type: 'model' },
  { name: 'ram', label: 'RAM', type: 'choice' },
  { name: 'almacenamiento', label: 'Almacenamiento', type: 'choice' },
  { name: 'precio_venta', label: 'Precio de venta', type: 'decimal' },
  { name: 'stock_minimo', label: 'Stock mínimo', type: 'integer' },
  { name: 'codigo', label: 'Código', type: 'text' },
  { name: 'estatus', label: 'Estado', type: 'status' },
  { name: 'descripcion', label: 'Descripción', type: 'textarea' },
  { name: 'imagen', label: 'Imagen del producto', type: 'image' },
]
const numericFields = new Set(['precio_venta', 'stock_minimo'])
const emptyDraft = Object.fromEntries(
  editableFields.map(({ name }) => [name, '']),
)

function productName(product) {
  const brand = String(product.marca ?? '').trim()
  const model = String(product.modelo ?? '').trim()
  if (brand && model) return `${brand} ${model}`
  if (brand) return `${brand} · Modelo pendiente de identificar`
  if (model) return `Marca pendiente de identificar · ${model}`
  return 'Pendiente de identificar'
}

function ProductIcon({ name }) {
  const paths = {
    add: 'M10 4v12M4 10h12',
    edit: 'M12.5 5.5 14.5 7.5M4 16l3.5-.7L15 7.8 12.2 5 4.7 12.5 4 16Z',
    delete: 'M5 6h10M8 6V4h4v2m2 0-.7 10H6.7L6 6m3 3v4m2-4v4',
    save: 'M4 4h10l2 2v10H4V4Zm3 0v4h6V4m-6 8h6v4H7v-4Z',
    cancel: 'M5 5l10 10M15 5 5 15',
    cube: 'm10 2 7 4v8l-7 4-7-4V6l7-4Zm0 8 7-4m-7 4L3 6m7 4v8',
  }

  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 20 20"
    >
      <path d={paths[name]} />
    </svg>
  )
}

function CompactButton({
  children,
  className = '',
  icon,
  ...props
}) {
  return (
    <button
      className={`inline-flex h-8 min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {icon && <ProductIcon name={icon} />}
      {children}
    </button>
  )
}

function ProductImage({ product }) {
  const imageValue = String(product.imagen ?? '')
  const projectImage = resolveProjectImage(imageValue)
  const previewSource = projectImage?.url || imageValue
  const [imageFailure, setImageFailure] = useState(null)
  const failedSource =
    imageFailure?.productId === product.id &&
    imageFailure?.imageValue === imageValue
      ? imageFailure.source
      : ''

  const source = previewSource && failedSource !== previewSource
    ? previewSource
    : ''

  if (!source) {
    return (
      <div className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 text-xs text-slate-500">
        <svg
          aria-hidden="true"
          className="h-10 w-10 text-blue-300"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 32 32"
        >
          <rect height="25" rx="4" width="14" x="9" y="3.5" />
          <path d="M14 7h4M14 26h4" strokeLinecap="round" />
        </svg>
        Fotografía no disponible
      </div>
    )
  }

  return (
    <img
      alt={`${product.marca ?? ''} ${product.modelo ?? ''}`.trim()}
      className="h-32 w-full rounded-xl bg-slate-50 object-contain p-2"
      onError={() =>
        setImageFailure({
          productId: product.id,
          imageValue,
          source,
        })
      }
      src={source}
    />
  )
}

function ProjectImageThumbnail({ image }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-slate-100 px-2 text-center text-xs text-red-700">
        No se pudo cargar esta imagen
      </div>
    )
  }

  return (
    <img
      alt=""
      className="h-24 w-full rounded-lg bg-slate-50 object-contain p-1"
      onError={() => setFailed(true)}
      src={image.url}
    />
  )
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function ProjectImagePicker({
  value,
  onChange,
  pendingFile,
  onPendingFileChange,
  disabled,
}) {
  const selectedImage = resolveProjectImage(value)
  const [activeOption, setActiveOption] = useState('project')
  const [failedPreview, setFailedPreview] = useState(null)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [candidateFile, setCandidateFile] = useState(null)
  const [filePreviewUrls, setFilePreviewUrls] = useState(() => new Map())
  const [urlDraft, setUrlDraft] = useState(
    isHttpUrl(String(value ?? '')) ? String(value) : '',
  )
  const [pickerError, setPickerError] = useState('')
  const fileInputRef = useRef(null)
  const filePreviewUrlsRef = useRef(new Map())
  const previewFile = candidateFile || pendingFile
  const filePreviewSource = previewFile
    ? filePreviewUrls.get(previewFile) || ''
    : ''
  const previewSource = previewFile
    ? filePreviewSource
    : selectedImage?.url || String(value ?? '')
  const previewFailed =
    failedPreview?.value === value && failedPreview?.source === previewSource

  useEffect(() => {
    return () => {
      filePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      filePreviewUrlsRef.current.clear()
    }
  }, [])

  const storeFilePreviewUrl = (file) => {
    const url = URL.createObjectURL(file)
    const previewUrls = new Map(filePreviewUrlsRef.current)
    previewUrls.set(file, url)
    filePreviewUrlsRef.current = previewUrls
    setFilePreviewUrls(previewUrls)
  }

  const releaseFilePreviewUrl = (file) => {
    const previewUrls = new Map(filePreviewUrlsRef.current)
    const url = previewUrls.get(file)
    if (!url) return

    URL.revokeObjectURL(url)
    previewUrls.delete(file)
    filePreviewUrlsRef.current = previewUrls
    setFilePreviewUrls(previewUrls)
  }

  useEffect(() => {
    if (!isGalleryOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsGalleryOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGalleryOpen])

  const selectImageValue = (nextValue) => {
    for (const file of new Set([candidateFile, pendingFile].filter(Boolean))) {
      releaseFilePreviewUrl(file)
    }
    setCandidateFile(null)
    setPickerError('')
    setUrlDraft(isHttpUrl(String(nextValue ?? '')) ? String(nextValue) : '')
    onPendingFileChange(null)
    onChange(nextValue)
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      validateProductImageFile(file)
      if (candidateFile && candidateFile !== pendingFile) {
        releaseFilePreviewUrl(candidateFile)
      }
      if (!filePreviewUrlsRef.current.has(file)) {
        storeFilePreviewUrl(file)
      }
      setCandidateFile(file)
      setPickerError('')
    } catch (validationError) {
      if (candidateFile && candidateFile !== pendingFile) {
        releaseFilePreviewUrl(candidateFile)
      }
      setCandidateFile(null)
      setPickerError(
        validationError instanceof Error
          ? validationError.message
          : 'La imagen debe ser JPG, JPEG, PNG o WEBP.',
      )
    }
  }

  const applyUrl = () => {
    const trimmedUrl = urlDraft.trim()
    if (!isHttpUrl(trimmedUrl)) {
      setPickerError('Introduce una URL válida que comience con http:// o https://.')
      return
    }

    setUrlDraft(trimmedUrl)
    selectImageValue(trimmedUrl)
  }

  return (
    <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
      {previewSource && !previewFailed ? (
        <img
          alt="Vista previa de la imagen del producto"
          className="h-40 w-full rounded-lg bg-white object-contain p-2"
          onError={() => setFailedPreview({ value, source: previewSource })}
          src={previewSource}
        />
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-blue-200 bg-white text-sm text-slate-500">
          <svg
            aria-hidden="true"
            className="h-9 w-9 text-blue-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 32 32"
          >
            <rect height="24" rx="3" width="26" x="3" y="4" />
            <circle cx="11" cy="12" r="2.5" />
            <path d="m5 25 8-8 5 5 4-4 5 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {previewFailed
            ? 'No se pudo cargar la imagen seleccionada.'
            : 'Seleccionar imagen'}
        </div>
      )}
      {candidateFile && (
        <p aria-live="polite" className="mt-2 break-all text-xs text-blue-900">
          Vista previa local: {candidateFile.name}. Confirma la selección para
          cargarla al guardar.
        </p>
      )}
      {pendingFile && !candidateFile && (
        <p aria-live="polite" className="mt-2 break-all text-xs text-blue-900">
          {pendingFile.name} está listo para cargarse al guardar. La imagen
          actual se conservará si cancelas el formulario.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          aria-pressed={activeOption === 'project'}
          className={`h-9 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            activeOption === 'project'
              ? 'bg-blue-800 text-white hover:bg-blue-900'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
          disabled={disabled}
          onClick={() => setActiveOption('project')}
          type="button"
        >
          Proyecto
        </button>
        <button
          aria-pressed={activeOption === 'computer'}
          className={`h-9 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            activeOption === 'computer'
              ? 'bg-blue-800 text-white hover:bg-blue-900'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
          disabled={disabled}
          onClick={() => setActiveOption('computer')}
          type="button"
        >
          Mi equipo
        </button>
        <button
          aria-pressed={activeOption === 'url'}
          className={`h-9 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            activeOption === 'url'
              ? 'bg-blue-800 text-white hover:bg-blue-900'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
          disabled={disabled}
          onClick={() => setActiveOption('url')}
          type="button"
        >
          URL
        </button>
        {value && (
          <button
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            disabled={disabled}
            onClick={() => selectImageValue('')}
            type="button"
          >
            Quitar imagen
          </button>
        )}
        {!pendingFile && value && (
          <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
            {selectedImage
              ? `Seleccionada: ${selectedImage.reference}`
              : 'Imagen actual seleccionada; se conservará al guardar'}
          </span>
        )}
        {pendingFile && !candidateFile && (
          <button
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            disabled={disabled}
            onClick={() => onPendingFileChange(null)}
            type="button"
          >
            Conservar imagen actual
          </button>
        )}
      </div>

      {activeOption === 'computer' && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3">
          <input
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          <p className="text-xs text-slate-600">
            Selecciona una imagen JPG, JPEG, PNG o WEBP de tu computadora.
            Primero se mostrará una vista previa; no se subirá hasta guardar.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className="h-9 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Seleccionar desde mi equipo
            </button>
            {candidateFile && (
              <>
                <button
                  className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  disabled={disabled}
                  onClick={() => {
                    onPendingFileChange(candidateFile)
                    setCandidateFile(null)
                    setPickerError('')
                  }}
                  type="button"
                >
                  Usar esta imagen
                </button>
                <button
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  disabled={disabled}
                  onClick={() => {
                    releaseFilePreviewUrl(candidateFile)
                    setCandidateFile(null)
                    setPickerError('')
                  }}
                  type="button"
                >
                  Cancelar selección
                </button>
              </>
            )}
          </div>
          {pickerError && (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {pickerError}
            </p>
          )}
        </div>
      )}

      {activeOption === 'url' && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3">
          <label className="block text-xs font-medium text-slate-700">
            URL de la imagen
            <input
              autoComplete="url"
              className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              disabled={disabled}
              onChange={(event) => {
                setUrlDraft(event.target.value)
                setPickerError('')
              }}
              placeholder="https://ejemplo.com/imagen.jpg"
              type="text"
              value={urlDraft}
            />
          </label>
          <button
            className="mt-2 h-9 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            disabled={disabled}
            onClick={applyUrl}
            type="button"
          >
            Usar URL
          </button>
          {pickerError && (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {pickerError}
            </p>
          )}
        </div>
      )}

      {activeOption === 'project' && (
        <div className="mt-3">
          <button
            className="h-9 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
            disabled={disabled}
            onClick={() => setIsGalleryOpen(true)}
            type="button"
          >
            {value ? 'Elegir otra imagen del proyecto' : 'Elegir imagen del proyecto'}
          </button>
        </div>
      )}

      {isGalleryOpen && activeOption === 'project' && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsGalleryOpen(false)
          }}
        >
          <section
            aria-labelledby="project-image-gallery-title"
            aria-modal="true"
            className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 sm:p-5">
              <div>
                <h5
                  className="font-bold text-blue-950"
                  id="project-image-gallery-title"
                >
                  Imágenes del proyecto
                </h5>
                <p className="mt-1 text-xs text-slate-500">
                  Selecciona una de las {localProductImages.length} imágenes disponibles.
                </p>
              </div>
              <button
                aria-label="Cerrar selector de imágenes"
                className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setIsGalleryOpen(false)}
                type="button"
              >
                Cerrar
              </button>
            </header>
            <div className="overflow-y-auto p-3 sm:p-4">
              {value && !selectedImage && (
                <button
                  aria-pressed="true"
                  className="mb-3 flex w-full items-center gap-3 rounded-xl border-2 border-blue-700 bg-blue-50 p-3 text-left ring-2 ring-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  onClick={() => {
                    selectImageValue(value)
                    setIsGalleryOpen(false)
                  }}
                  type="button"
                >
                  {previewSource && !previewFailed ? (
                    <img
                      alt=""
                      className="h-20 w-24 shrink-0 rounded-lg bg-white object-contain p-1"
                      onError={() =>
                        setFailedPreview({ value, source: previewSource })
                      }
                      src={previewSource}
                    />
                  ) : (
                    <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-blue-200 bg-white px-2 text-center text-[10px] text-slate-500">
                      Vista previa no disponible
                    </div>
                  )}
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-blue-950">
                      Imagen actual del producto
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-600">
                      Está seleccionada y se conservará si no eliges otra.
                    </span>
                    <span className="mt-1 block text-[10px] font-bold text-blue-800">
                      Seleccionada
                    </span>
                  </span>
                </button>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {localProductImages.map((image) => {
                  const isSelected = selectedImage?.reference === image.reference
                  const pathParts = image.reference.split('/')

                  return (
                    <button
                      aria-pressed={isSelected && !pendingFile && !candidateFile}
                      className={`min-w-0 rounded-xl border p-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                        isSelected && !pendingFile && !candidateFile
                          ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                      key={image.reference}
                      onClick={() => {
                        selectImageValue(image.reference)
                        setIsGalleryOpen(false)
                      }}
                      type="button"
                    >
                      <ProjectImageThumbnail image={image} />
                      <span className="mt-2 block truncate text-xs font-semibold text-blue-950">
                        {pathParts.at(-1)}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {pathParts.slice(-3, -1).join(' / ')}
                      </span>
                      {isSelected && !pendingFile && !candidateFile && (
                        <span className="mt-1 block text-[10px] font-bold text-blue-800">
                          Seleccionada
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function displayValue(value) {
  return value === null || value === undefined || value === ''
    ? 'No disponible'
    : value
}

function ProductDetailsModal({ product, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const details = [
    ['Marca', product.marca || 'Pendiente de identificar'],
    ['Modelo', product.modelo || 'Pendiente de identificar'],
    ['Almacenamiento', product.almacenamiento],
    ['Color', 'No disponible'],
    ['Precio de venta', formatPrice(product.precio_venta)],
    ['Estado', product.estatus],
    ['Código', product.codigo],
  ]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="product-details-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-blue-100 bg-white p-5 shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
              Catálogo de productos
            </p>
            <h3
              className="mt-1 text-xl font-bold text-blue-950"
              id="product-details-title"
            >
              {productName(product)}
            </h3>
          </div>
          <button
            aria-label="Cerrar detalles del producto"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 p-2">
          <ProductImage product={product} />
        </div>
        {product.descripcion && (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {product.descripcion}
          </p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3">
          {details.map(([label, value]) => (
            <div className="rounded-xl bg-slate-50 p-3" key={label}>
              <dt className="text-xs font-medium text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-blue-950">
                {displayValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') {
    return 'No disponible'
  }
  const price = Number(value)
  if (!Number.isFinite(price) || price <= 0) return 'No disponible'

  return `Bs. ${price.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function makeDraft(product) {
  if (!product) return { ...emptyDraft }

  return Object.fromEntries(
    editableFields.map(({ name }) => [name, product[name] ?? '']),
  )
}

function toProductPayload(draft) {
  return Object.fromEntries(
    editableFields.map(({ name }) => {
      const value = draft[name]
      if (numericFields.has(name)) {
        if (value === '') return [name, null]

        const number = Number(value)
        if (!Number.isFinite(number)) {
          throw new Error(`El campo ${name} debe ser un número válido.`)
        }
        return [name, number]
      }

      return [name, value]
    }),
  )
}

function validateImei(value, label) {
  if (!value) return ''
  if (!/^\d{15}$/.test(value)) {
    return `${label} debe contener exactamente 15 dígitos.`
  }

  let sum = 0
  let doubleDigit = true
  for (let index = value.length - 2; index >= 0; index -= 1) {
    let digit = Number(value[index])
    if (doubleDigit) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    doubleDigit = !doubleDigit
  }

  const checkDigit = (10 - (sum % 10)) % 10
  if (checkDigit !== Number(value.at(-1))) {
    return `${label} no supera la validación del dígito de control.`
  }
  return ''
}

function describeProductWriteError(error) {
  if (error && typeof error === 'object') {
    const fields = []
    if ('code' in error && error.code) fields.push(`Código: ${error.code}`)
    if ('message' in error && error.message) fields.push(String(error.message))
    if ('details' in error && error.details) {
      fields.push(`Detalles: ${error.details}`)
    }
    if (fields.length > 0) return fields.join('\n')
  }

  if (typeof error === 'string' && error.trim()) return error
  if (error instanceof Error && error.message) return error.message
  return 'No se pudo guardar el producto.'
}

function ProductsPage({ canManage = false }) {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selected3DProduct, setSelected3DProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState(0)
  const [formMode, setFormMode] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [draft, setDraft] = useState({ ...emptyDraft })
  const [pendingImageFile, setPendingImageFile] = useState(null)
  const [imeiDraft, setImeiDraft] = useState({ imei1: '', imei2: '' })
  const [productImeis, setProductImeis] = useState({
    imei1: '',
    imei2: '',
    unassignedCount: 0,
  })
  const [imeiLoading, setImeiLoading] = useState(false)
  const [imeiLoadError, setImeiLoadError] = useState('')
  const [writeError, setWriteError] = useState('')
  const [writeSuccess, setWriteSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const brandSuggestions = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => String(product.marca ?? '').trim())
            .filter(Boolean),
        ),
      ].sort((left, right) => left.localeCompare(right)),
    [products],
  )
  const modelSuggestions = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => String(product.modelo ?? '').trim())
            .filter(Boolean),
        ),
      ].sort((left, right) => left.localeCompare(right)),
    [products],
  )
  const productStatusOptions = useMemo(
    () => [
      ...new Set([
        'ACTIVO',
        ...products
          .map((product) => String(product.estatus ?? '').trim())
          .filter(Boolean),
      ]),
    ],
    [products],
  )

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    fetchProducts(controller.signal)
      .then((data) => {
        if (!active) return
        setProducts(data)
        setStatus('success')
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar los productos.',
        )
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [requestId])

  useEffect(() => {
    if (formMode !== 'edit' || !editingProduct) return undefined

    let active = true
    const controller = new AbortController()

    fetchProductImeis(editingProduct.id, controller.signal)
      .then((rows) => {
        if (!active) return
        setProductImeis(rows)
        setImeiDraft({ imei1: rows.imei1, imei2: rows.imei2 })
      })
      .catch((requestError) => {
        if (!active || controller.signal.aborted) return
        setImeiLoadError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron consultar los IMEI asociados.',
        )
      })
      .finally(() => {
        if (active) setImeiLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [editingProduct, formMode])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    if (!term) return products

    return products.filter((product) =>
      `${product.marca ?? ''} ${product.modelo ?? ''} ${product.codigo ?? ''}`
        .toLocaleLowerCase()
        .includes(term),
    )
  }, [products, search])

  const handleRetry = () => {
    setError('')
    setStatus('loading')
    setRequestId((current) => current + 1)
  }

  const openCreateForm = () => {
    setEditingProduct(null)
    setDraft({ ...emptyDraft })
    setPendingImageFile(null)
    setImeiDraft({ imei1: '', imei2: '' })
    setProductImeis({ imei1: '', imei2: '', unassignedCount: 0 })
    setImeiLoading(false)
    setImeiLoadError('')
    setWriteError('')
    setWriteSuccess('')
    setFormMode('create')
  }

  const openEditForm = (product) => {
    setEditingProduct(product)
    setDraft(makeDraft(product))
    setPendingImageFile(null)
    setImeiDraft({ imei1: '', imei2: '' })
    setProductImeis({ imei1: '', imei2: '', unassignedCount: 0 })
    setImeiLoading(true)
    setImeiLoadError('')
    setWriteError('')
    setWriteSuccess('')
    setFormMode('edit')
  }

  const closeForm = () => {
    if (saving) return
    setFormMode(null)
    setEditingProduct(null)
    setDraft({ ...emptyDraft })
    setPendingImageFile(null)
    setImeiDraft({ imei1: '', imei2: '' })
    setProductImeis({ imei1: '', imei2: '', unassignedCount: 0 })
    setImeiLoading(false)
    setWriteError('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setWriteError('')
    setWriteSuccess('')

    try {
      const brandError = validateProductBrand(draft.marca)
      if (brandError) throw new Error(brandError)

      const modelError = validateProductModel(draft.modelo)
      if (modelError) throw new Error(modelError)

      const imei1 = imeiDraft.imei1.trim()
      const imei2 = imeiDraft.imei2.trim()
      const imei1Error = validateImei(imei1, 'IMEI 1')
      const imei2Error = validateImei(imei2, 'IMEI 2')
      if (imei1Error || imei2Error) {
        throw new Error(imei1Error || imei2Error)
      }

      const effectiveImeis = [
        {
          position: 1,
          value: imei1 || (formMode === 'edit' ? productImeis.imei1 : ''),
        },
        {
          position: 2,
          value: imei2 || (formMode === 'edit' ? productImeis.imei2 : ''),
        },
      ].filter(({ value }) => value)
      if (
        effectiveImeis.length === 2 &&
        effectiveImeis[0].value === effectiveImeis[1].value
      ) {
        throw new Error('IMEI 1 e IMEI 2 no pueden tener el mismo número.')
      }

      if (effectiveImeis.length > 0) {
        const existingImeis = await findExistingImeis(
          effectiveImeis.map(({ value }) => value),
        )
        const hasDuplicate = effectiveImeis.some(({ position, value }) => {
          const matches = existingImeis.filter(
            (row) => String(row.imei) === value,
          )
          return (
            matches.length > 1 ||
            matches.some(
              (row) =>
                String(row.producto_id) !== String(editingProduct?.id) ||
                Number(row.posicion) !== position,
            )
          )
        })
        if (hasDuplicate) {
          throw new Error('Uno de los IMEI ya está registrado.')
        }
      }

      const payload = toProductPayload(draft)
      if (formMode === 'edit') {
        await updateProduct(
          editingProduct.id,
          payload,
          imei1,
          imei2,
          pendingImageFile,
        )
        setWriteSuccess('Producto actualizado correctamente.')
      } else {
        await createProduct(payload, imei1, imei2, pendingImageFile)
        setWriteSuccess('Producto registrado correctamente.')
      }

      setFormMode(null)
      setEditingProduct(null)
      setRequestId((current) => current + 1)
    } catch (requestError) {
      setWriteError(describeProductWriteError(requestError))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product) => {
    const productName = [product.marca, product.modelo]
      .filter(Boolean)
      .join(' ')
    const confirmed = window.confirm(
      `¿Eliminar permanentemente ${productName || `el producto ${product.id}`}?`,
    )
    if (!confirmed) return

    setWriteError('')
    setWriteSuccess('')
    setSaving(true)
    try {
      await deleteProduct(product.id)
      setWriteSuccess('Producto eliminado correctamente.')
      setRequestId((current) => current + 1)
    } catch (requestError) {
      setWriteError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo eliminar el producto.',
      )
    } finally {
      setSaving(false)
    }
  }

  const renderProductField = ({ name, label, type }) => {
    const fullWidth = name === 'descripcion' || name === 'imagen'
    const fieldClass = `block text-[11px] font-medium text-slate-700 ${
      fullWidth ? 'sm:col-span-2' : ''
    }`
    if (type === 'image') {
      return (
        <div className={fieldClass} key={name}>
          <span>{label}</span>
          <ProjectImagePicker
            onChange={(value) => {
              setDraft((current) => ({ ...current, [name]: value }))
              setWriteError('')
            }}
            onPendingFileChange={setPendingImageFile}
            pendingFile={pendingImageFile}
            disabled={saving}
            value={draft[name]}
          />
        </div>
      )
    }

    const controlClass =
      'mt-1 block w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
    const onChange = (event) => {
      const value = ['brand', 'model', 'decimal', 'integer'].includes(type)
        ? normalizeProductFieldInput(type, event.target.value)
        : event.target.value
      if (value === null) return

      setDraft((current) => ({
        ...current,
        [name]: value,
      }))
      setWriteError('')
    }

    if (type === 'choice') {
      const currentValue = String(draft[name] ?? '')
      const options = productChoiceOptions[name]
      const availableOptions =
        currentValue && !options.includes(currentValue)
          ? [...options, currentValue]
          : options

      return (
        <label className={fieldClass} key={name}>
          {label}
          <select
            className={`${controlClass} h-8 bg-white`}
            onChange={onChange}
            value={currentValue}
          >
            <option value="">Sin especificar</option>
            {availableOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )
    }

    if (type === 'status') {
      const currentStatus = String(draft[name] ?? '')
      const statusOptions = productStatusOptions.includes(currentStatus)
        ? productStatusOptions
        : currentStatus
          ? [...productStatusOptions, currentStatus]
          : productStatusOptions

      return (
        <label className={fieldClass} key={name}>
          {label}
          <select
            className={`${controlClass} h-8 bg-white`}
            onChange={onChange}
            value={currentStatus}
          >
            <option value="">Sin especificar</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )
    }

    return (
      <label className={fieldClass} key={name}>
        {label}
        {type === 'textarea' ? (
          <textarea
            className={`${controlClass} h-14 resize-none py-2`}
            onChange={onChange}
            value={draft[name]}
          />
        ) : type === 'brand' || type === 'model' ? (
          <>
            <input
              className={`${controlClass} h-8`}
              list={`product-${name}-options`}
              onChange={onChange}
              type="text"
              value={draft[name]}
            />
            <datalist id={`product-${name}-options`}>
              {(type === 'brand' ? brandSuggestions : modelSuggestions).map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </>
        ) : (
          <input
            className={`${controlClass} h-8`}
            onChange={onChange}
            inputMode={
              type === 'decimal'
                ? 'decimal'
                : type === 'integer'
                  ? 'numeric'
                  : undefined
            }
            type={type === 'decimal' || type === 'integer' ? 'text' : type}
            value={draft[name]}
          />
        )}
      </label>
    )
  }

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-blue-950">Productos</h3>
          <p className="mt-1 text-sm text-slate-500">
            Catálogo de productos de TRADING SPACE
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-64">
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="product-search"
            >
              Buscar por marca o modelo
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="product-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej.: marca, modelo o código"
              type="search"
              value={search}
            />
          </div>
          {canManage && (
            <CompactButton
              className="self-start bg-blue-800 text-white hover:bg-blue-900 sm:self-auto"
              disabled={saving}
              icon="add"
              onClick={openCreateForm}
              type="button"
            >
              Nuevo producto
            </CompactButton>
          )}
        </div>
      </div>

      {writeError && (
        <div
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <p className="font-semibold">No se pudo completar la operación.</p>
          <p className="mt-1 break-words">{writeError}</p>
        </div>
      )}
      {writeSuccess && (
        <div
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          {writeSuccess}
        </div>
      )}

      {canManage && formMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <form
            aria-labelledby="product-form-title"
            aria-modal="true"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-[40rem] overflow-y-auto rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSave}
            role="dialog"
          >
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
                Administración de productos
              </p>
              <h4
                className="mt-1 text-lg font-bold text-blue-950"
                id="product-form-title"
              >
                {formMode === 'edit' ? 'Editar producto' : 'Nuevo producto'}
              </h4>
            </div>
            {writeError && (
              <div
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                <p className="font-semibold">No se pudo completar la operación.</p>
                <p className="mt-1 break-words">{writeError}</p>
              </div>
            )}
            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-900">
              <p>Al editar, deja vacío un campo para conservar su IMEI actual.</p>
              {formMode === 'edit' && (
                <p className="mt-1">
                  {imeiLoading
                    ? 'Consultando IMEI asociados…'
                    : imeiLoadError
                      ? `No se pudieron cargar los IMEI: ${imeiLoadError}`
                      : productImeis.unassignedCount > 0
                        ? `Hay ${productImeis.unassignedCount} registro(s) antiguo(s) sin posición; se conservan sin modificarlos.`
                        : ''}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              {editableFields.slice(0, 2).map(renderProductField)}
              <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:col-span-2 sm:grid-cols-2">
                {[
                  { name: 'imei1', label: 'IMEI 1' },
                  { name: 'imei2', label: 'IMEI 2' },
                ].map(({ name, label }) => (
                  <label
                    className="block text-[11px] font-medium text-slate-700"
                    key={name}
                  >
                    {label}
                    <input
                      autoComplete="off"
                      className="mt-1 block h-8 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      inputMode="numeric"
                      onChange={(event) => {
                        const value = normalizeProductFieldInput(
                          'imei',
                          event.target.value,
                        )
                        if (value === null) return

                        setImeiDraft((current) => ({
                          ...current,
                          [name]: value,
                        }))
                        setWriteError('')
                      }}
                      maxLength={15}
                      pattern="[0-9]*"
                      type="text"
                      value={imeiDraft[name]}
                    />
                  </label>
                ))}
              </div>
              {editableFields.slice(2).map(renderProductField)}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <CompactButton
                className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                disabled={saving}
                icon="cancel"
                onClick={closeForm}
                type="button"
              >
                Cancelar
              </CompactButton>
              <CompactButton
                className="bg-blue-800 text-white hover:bg-blue-900"
                disabled={saving}
                icon="save"
                type="submit"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </CompactButton>
            </div>
          </form>
        </div>
      )}

      {status === 'loading' && (
        <div
          aria-live="polite"
          className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm"
        >
          Cargando productos…
        </div>
      )}

      {status === 'error' && (
        <div
          className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"
          role="alert"
        >
          <p className="font-medium text-red-700">
            No se pudieron cargar los productos.
          </p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            className="mt-5 rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white transition hover:bg-blue-900"
            onClick={handleRetry}
            type="button"
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'success' && products.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
          No hay productos registrados.
        </div>
      )}

      {status === 'success' &&
        products.length > 0 &&
        filteredProducts.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            No se encontraron productos para “{search.trim()}”.
          </div>
        )}

      {status === 'success' && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <article
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              key={product.id}
            >
              <ProductImage product={product} />
              <div className="mt-3 flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate text-base font-bold text-blue-950">
                      {productName(product)}
                    </h4>
                    {product.codigo && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        Código: {product.codigo}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      String(product.estatus).toUpperCase() === 'ACTIVO'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {displayValue(product.estatus)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <dt className="text-slate-500">Almacenamiento</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800">
                      {displayValue(product.almacenamiento)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <dt className="text-slate-500">Color</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800">
                      No disponible
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-lg font-bold text-blue-900">
                  {formatPrice(product.precio_venta)}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  <CompactButton
                    className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={() => setSelectedProduct(product)}
                    type="button"
                  >
                    Ver
                  </CompactButton>
                  <CompactButton
                    className="border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                    icon="cube"
                    onClick={() => setSelected3DProduct(product)}
                    type="button"
                  >
                    Ver 3D
                  </CompactButton>
                  {canManage && (
                    <>
                      <CompactButton
                        aria-label={`Editar ${product.marca ?? ''} ${product.modelo ?? ''}`.trim()}
                        className="ml-auto border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                        disabled={saving}
                        icon="edit"
                        onClick={() => openEditForm(product)}
                        title="Editar producto"
                        type="button"
                      />
                      <CompactButton
                        aria-label={`Eliminar ${product.marca ?? ''} ${product.modelo ?? ''}`.trim()}
                        className="border border-red-200 bg-white text-red-700 hover:bg-red-50"
                        disabled={saving}
                        icon="delete"
                        onClick={() => handleDelete(product)}
                        title="Eliminar producto"
                        type="button"
                      />
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductDetailsModal
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
        />
      )}

      {selected3DProduct && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4">
              <section
                aria-live="polite"
                aria-modal="true"
                className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
                role="dialog"
              >
                Cargando visor 3D…
              </section>
            </div>
          }
        >
          <Phone3DViewer
            onClose={() => setSelected3DProduct(null)}
            product={selected3DProduct}
          />
        </Suspense>
      )}
    </section>
  )
}

export default ProductsPage
