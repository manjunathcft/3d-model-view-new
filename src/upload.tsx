import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { S3_BUCKET_URL } from './s3-upload-config';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file || !slug) return alert('Please select a file and enter a route name.');

    setLoading(true);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${slug}.${ext}`;
    const uploadUrl = `${S3_BUCKET_URL}/${fileName}`;

    try {
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!res.ok) throw new Error('Upload failed');

      navigate(`/${slug}`);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Upload 3D Model</h1>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium mb-2">
              Select 3D Model
            </label>
            <div className="relative">
              <input
                id="file-upload"
                type="file"
                accept=".glb,.gltf,.fbx,.obj"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-400">
                Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="route-name" className="block text-sm font-medium mb-2">
              Route Name
            </label>
            <input
              id="route-name"
              type="text"
              placeholder="e.g. cheeko2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={loading || !file || !slug}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 8.8 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              'Upload Model'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}