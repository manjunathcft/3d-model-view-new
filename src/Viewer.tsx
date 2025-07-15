// src/Viewer.tsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { useParams } from 'react-router-dom';
import { S3_BUCKET_URL } from './s3-upload-config';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Loader } from 'lucide-react';

export default function Viewer() {
  const { slug } = useParams<{ slug: string }>();
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current?.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(ambientLight, directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    const loadModel = async () => {
      const extensions = ['glb', 'gltf', 'fbx', 'obj'];

      for (const ext of extensions) {
        const url = `${S3_BUCKET_URL}/${slug}.${ext}`;
        console.log(`Trying to load: ${url}`);
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok) continue;

          if (ext === 'glb' || ext === 'gltf') {
            const gltf = await new GLTFLoader().loadAsync(url);
            scene.add(gltf.scene);
          } else if (ext === 'fbx') {
            const fbx = await new FBXLoader().loadAsync(url);
            scene.add(fbx);
          } else if (ext === 'obj') {
            const obj = await new OBJLoader().loadAsync(url);
            obj.traverse((child: any) => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
              }
            });
            scene.add(obj);
          }

          setLoading(false);
          animate();
          return;
        } catch (err) {
          console.warn(`Failed to load ${ext} from: ${url}`, err);
        }
      }

      setLoading(false);
      setError('Error loading model: unsupported format or file not found.');
    };

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    loadModel();

    return () => {
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-black text-white relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-10">
          <Loader className="w-10 h-10 animate-spin text-white" />
        </div>
      )}
      {error && <p className="text-red-500 p-4 absolute z-10">{error}</p>}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
