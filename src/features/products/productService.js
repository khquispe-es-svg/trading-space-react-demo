import { supabase } from '../../lib/supabase.js'

const PRODUCT_COLUMNS =
  'id,marca,modelo,almacenamiento,ram,descripcion,imagen,precio_venta,stock_minimo,estatus,created_at,updated_at,codigo'
const PRODUCT_IMEI_COLUMNS = 'producto_id,posicion,imei'
const PRODUCT_IMAGE_BUCKET = 'productos'
const PRODUCT_IMAGE_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function validateProductImageFile(file) {
  if (!file || typeof file.name !== 'string') {
    throw new Error('Selecciona un archivo de imagen válido.')
  }

  const extension = file.name.split('.').at(-1)?.toLowerCase()
  const contentType = PRODUCT_IMAGE_TYPES[extension]
  if (!contentType || (file.type && file.type !== contentType)) {
    throw new Error('La imagen debe ser JPG, JPEG, PNG o WEBP.')
  }

  return { extension, contentType }
}

async function removeUploadedProductImage(path) {
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .remove([path])

  if (error) throw error
}

function errorMessage(error) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return String(error)
}

async function saveProduct(rpcName, rpcParameters, product, imageFile) {
  let uploadedImage = null
  let savedProduct = product

  if (imageFile) {
    const { extension, contentType } = validateProductImageFile(imageFile)
    const uuid = globalThis.crypto?.randomUUID?.()
    if (!uuid) {
      throw new Error('Este navegador no permite generar un identificador seguro para la imagen.')
    }

    const path = `${uuid}.${extension}`
    console.info('[Products] Storage upload started', {
      bucket: PRODUCT_IMAGE_BUCKET,
    })
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, imageFile, { contentType, upsert: false })
    if (uploadError) {
      console.error('[Products] Storage upload failed', uploadError)
      throw uploadError
    }
    console.info('[Products] Storage upload succeeded')

    uploadedImage = { path }
    const { data } = supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(path)
    if (!data?.publicUrl) {
      try {
        await removeUploadedProductImage(path)
      } catch (cleanupError) {
        throw new Error(
          `No se pudo obtener la URL pública de la imagen ni limpiar el archivo recién subido: ${errorMessage(cleanupError)}`,
        )
      }
      throw new Error('Supabase no devolvió la URL pública de la imagen.')
    }

    console.info('[Products] Public image URL obtained', data.publicUrl)
    savedProduct = { ...product, imagen: data.publicUrl }
  }

  console.info('[Products] RPC call started', { rpc: rpcName })
  try {
    const { data, error } = await supabase.rpc(rpcName, {
      ...rpcParameters,
      p_producto: savedProduct,
    })
    if (error) throw error
    return data
  } catch (saveError) {
    console.error('[Products] RPC call failed', {
      rpc: rpcName,
      code: saveError?.code,
      message: saveError?.message,
      details: saveError?.details,
    })
    if (uploadedImage) {
      try {
        await removeUploadedProductImage(uploadedImage.path)
      } catch (cleanupError) {
        throw new Error(
          `${errorMessage(saveError)} Además, no se pudo limpiar la imagen recién subida: ${errorMessage(cleanupError)}`,
        )
      }
    }
    throw saveError
  }
}

export async function fetchProducts(signal) {
  const { data, error } = await supabase
    .from('Producto')
    .select(PRODUCT_COLUMNS)
    .abortSignal(signal)

  if (error) throw error
  return data ?? []
}

export async function fetchProductImeis(productId, signal) {
  let query = supabase
    .from('imeis')
    .select(PRODUCT_IMEI_COLUMNS)
    .eq('producto_id', productId)

  if (signal) query = query.abortSignal(signal)

  const { data, error } = await query
  if (error) throw error

  const imeis = { imei1: '', imei2: '', unassignedCount: 0 }
  const positions = new Set()
  for (const row of data ?? []) {
    if (row.posicion === null || row.posicion === undefined) {
      imeis.unassignedCount += 1
      continue
    }

    const position = Number(row.posicion)
    if (position !== 1 && position !== 2) {
      throw new Error(`Posición de IMEI no reconocida: ${row.posicion}`)
    }
    if (positions.has(position)) {
      throw new Error(`Hay más de un IMEI asignado a la posición ${position}.`)
    }

    positions.add(position)
    imeis[position === 1 ? 'imei1' : 'imei2'] =
      row.imei === null || row.imei === undefined ? '' : String(row.imei)
  }

  return imeis
}

export async function findExistingImeis(values, signal) {
  if (values.length === 0) return []

  let query = supabase
    .from('imeis')
    .select(PRODUCT_IMEI_COLUMNS)
    .in('imei', values)

  if (signal) query = query.abortSignal(signal)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createProduct(product, imei1, imei2, imageFile = null) {
  return saveProduct(
    'guardar_producto_con_imeis',
    {
      p_imei1: imei1 || null,
      p_imei2: imei2 || null,
    },
    product,
    imageFile,
  )
}

export async function updateProduct(id, product, imei1, imei2, imageFile = null) {
  return saveProduct(
    'actualizar_producto_con_imeis',
    {
      p_id: id,
      p_imei1: imei1 || null,
      p_imei2: imei2 || null,
    },
    product,
    imageFile,
  )
}

export async function deleteProduct(id) {
  const { data, error } = await supabase.rpc('eliminar_producto_seguro', {
    p_id: id,
  })

  if (error) throw error
  return data
}
