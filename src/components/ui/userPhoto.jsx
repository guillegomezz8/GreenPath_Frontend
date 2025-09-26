import { useState } from 'react';
import { User } from 'lucide-react';

function UserPhoto({ className, src, table=false }) {
  const [error, setError] = useState(false);
  const photoUrl = src && !src.startsWith('http') ? `${import.meta.env.VITE_APP_API_URL}${src}` : src;
  let img = null;
  if (!src || error) {
    img = <User className={`w-[55%] h-[55%] text-gray-600 ${className}`} />;
  }

  else{
    img = (<img
      src={photoUrl}
      alt="Foto del usuario"
      className={`w-full h-full object-cover ${className}`}
      onError={() => setError(true)}
    />)
  } 
  
  return (table ? (
    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden relative">
      {img}
    </div>
  ): img);
}

export default UserPhoto;
