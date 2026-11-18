/** URLs für die geschützten Bilder. */
export const photoSrc = (id: number, size: 480 | 1200 | 2400 | 'original' = 1200) =>
	`/media/${id}/${size}`;

export const photoSrcset = (id: number) =>
	`/media/${id}/480 480w, /media/${id}/1200 1200w, /media/${id}/2400 2400w`;
