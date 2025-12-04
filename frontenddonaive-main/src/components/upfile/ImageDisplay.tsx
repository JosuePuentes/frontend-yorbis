import React, { useState, useEffect } from "react";
import { getPresignedUrl } from "./UpFile";

interface ImageDisplayProps {
  imageName: string;
  alt?: string;
  style?: React.CSSProperties;
  onClickImage?: (url: string) => void;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageName, alt, style, onClickImage }) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        const url = await getPresignedUrl(imageName, "get_object");
        setImageUrl(url);
      } catch (err: any) {
        setError("Failed to load image: " + (err.message || err));
      }
    };
    if (imageName) fetchImageUrl();
  }, [imageName]);

  if (error) return <div className="text-red-600 text-xs">{error}</div>;
  if (!imageUrl) return <div className="text-gray-500 text-xs">Cargando imagen...</div>;

  return (
    <div>
      <img
        src={imageUrl}
        alt={alt || imageName}
        style={style || { maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
        onClick={() => {
          if (onClickImage) {
            onClickImage(imageUrl);
          } else {
            setShowModal(true);
          }
        }}
      />
      {showModal && !onClickImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setShowModal(false)}
        >
          <div className="flex items-center justify-center w-full h-full">
            <img
              src={imageUrl}
              alt={alt || imageName}
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 0 24px #0008', background: '#fff' }}
              onClick={e => e.stopPropagation()}
              className="mx-auto block"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
