import { tamanhoComprimido } from '../lib/regras.js'

// Foto de celular passa de 5 MB (limite do bucket): reduz e regrava em JPEG antes de enviar.
// `imageOrientation: 'from-image'` já gira a foto como o celular tirou.
export async function comprimirFoto(arquivo) {
  const imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  const { largura, altura } = tamanhoComprimido(imagem.width, imagem.height)
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  tela.getContext('2d').drawImage(imagem, 0, 0, largura, altura)
  imagem.close()
  const blob = await new Promise((resolve) => tela.toBlob(resolve, 'image/jpeg', 0.8))
  if (!blob) throw new Error('Não deu para comprimir a foto.')
  return blob
}
