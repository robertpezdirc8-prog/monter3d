/**
 * imageCoords.ts — pretvorba koordinat klika v koordinate izvorne slike.
 *
 * Slike v predogledu so prikazane z `object-contain`, zato se med elementom in
 * dejansko sliko pojavijo prazni robovi (letterbox). Ta funkcija jih odstrani,
 * da klik na zaslonu pravilno preslikamo v piksle izvorne fotografije.
 */

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ImagePoint {
  x: number;
  y: number;
}

export function displayPointToImage(
  clientX: number,
  clientY: number,
  rect: RectLike,
  naturalWidth: number,
  naturalHeight: number
): ImagePoint {
  if (naturalWidth <= 0 || naturalHeight <= 0 || rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }

  const naturalAspect = naturalWidth / naturalHeight;
  const boxAspect = rect.width / rect.height;

  let drawWidth: number;
  let drawHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (naturalAspect > boxAspect) {
    // slika je širša od okvira — prazni robovi zgoraj/spodaj
    drawWidth = rect.width;
    drawHeight = rect.width / naturalAspect;
    offsetY = (rect.height - drawHeight) / 2;
  } else {
    // slika je višja od okvira — prazni robovi levo/desno
    drawHeight = rect.height;
    drawWidth = rect.height * naturalAspect;
    offsetX = (rect.width - drawWidth) / 2;
  }

  const x = ((clientX - rect.left - offsetX) / drawWidth) * naturalWidth;
  const y = ((clientY - rect.top - offsetY) / drawHeight) * naturalHeight;

  return {
    x: Math.min(naturalWidth - 1, Math.max(0, x)),
    y: Math.min(naturalHeight - 1, Math.max(0, y))
  };
}
