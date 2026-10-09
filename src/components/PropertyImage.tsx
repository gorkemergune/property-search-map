import { useState } from 'react';
import { getFallbackImage } from '../data/images';
import type { Property } from '../types/property';

interface Props {
  property: Pick<Property, 'image' | 'imageAlt' | 'type'>;
  className?: string;
}

/** Listing photo that swaps to an inline SVG placeholder if the remote image fails. */
export function PropertyImage({ property, className = '' }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? getFallbackImage(property.type) : property.image}
      alt={property.imageAlt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
