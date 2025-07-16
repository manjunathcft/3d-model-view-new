// src/Viewer.tsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { useParams } from 'react-router-dom';
import { S3_BUCKET_URL } from './s3-upload-config';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Loader, RotateCcw, Pause, Play, Eye } from 'lucide-react';

export default function Viewer() {
  const { slug } = useParams<{ slug: string }>();
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [objects, setObjects] = useState<THREE.Object3D[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [useGrayMaterial, setUseGrayMaterial] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const animationFrameId = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  useEffect(() => {
    if (!slug) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#666666');
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current?.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(ambientLight, directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    controlsRef.current = controls;

    sceneRef.current = scene;

    const loadModel = async () => {
      setLoading(true);
      const extensions = ['glb', 'gltf', 'fbx', 'obj'];

      for (const ext of extensions) {
        const url = `${S3_BUCKET_URL}/${slug}.${ext}`;
        console.log(`Trying to load: ${url}`);
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok) continue;

          let model: THREE.Object3D;

          if (ext === 'glb' || ext === 'gltf') {
            const gltf = await new GLTFLoader().loadAsync(url);
            model = gltf.scene;
            if (gltf.animations && gltf.animations.length > 0) {
              mixerRef.current = new THREE.AnimationMixer(model);
              gltf.animations.forEach((clip) => {
                mixerRef.current!.clipAction(clip).play();
              });
            }
          } else if (ext === 'fbx') {
            model = await new FBXLoader().loadAsync(url);
          } else if (ext === 'obj') {
            model = await new OBJLoader().loadAsync(url);
            model.traverse((child: any) => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
              }
            });
          } else {
            continue;
          }

          scene.add(model);
          const children: THREE.Object3D[] = [];
          model.traverse((child) => {
            if (child.name && child.type !== 'Scene') {
              children.push(child);
              if (child instanceof THREE.Mesh) {
                originalMaterials.current.set(child, child.material);
              }
            }
          });
          setObjects(children);

          setLoading(false);
          animate();
          return;
        } catch (err) {
          console.warn(`Failed to load ${ext} from: ${url}`, err);
        }
      }

      setError('Error loading model: unsupported format or file not found.');
      setLoading(false);
    };

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        if (isPlaying && mixerRef.current) {
          mixerRef.current.update(0.016);
        }
        controlsRef.current?.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    loadModel();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (rendererRef.current && mountRef.current?.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [slug, isPlaying]);

  const focusObject = (obj: THREE.Object3D) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    controlsRef.current.target.copy(center);
    cameraRef.current.position.set(center.x, center.y, center.z + 2);
    controlsRef.current.update();
  };

  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 0, 3);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const toggleMaterial = () => {
    setUseGrayMaterial((prev) => {
      const toGray = !prev;
      objects.forEach((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (toGray) {
            obj.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
          } else {
            const original = originalMaterials.current.get(obj);
            if (original) obj.material = original;
          }
        }
      });
      return toGray;
    });
  };

  return (
    <div className="relative min-h-screen text-white">
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-10">
          <Loader className="w-10 h-10 animate-spin text-white" />
        </div>
      )}
      {error && <p className="text-red-500 p-4 absolute z-10">{error}</p>}

      <div ref={mountRef} className="w-full h-full" />

      {showLayerPanel && (
        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur p-3 rounded text-sm z-20 max-h-[80vh] overflow-y-auto">
          <h2 className="font-bold mb-2">Object Layers</h2>
          {objects.length > 0 ? (
            objects.map((obj, i) => (
              <button
                key={i}
                onClick={() => focusObject(obj)}
                className="text-left block w-full px-2 py-1 hover:bg-white/20 rounded"
              >
                {obj.name || `Object ${i + 1}`}
              </button>
            ))
          ) : (
            <p className="text-xs italic">No objects</p>
          )}
          <button
            onClick={resetView}
            className="mt-2 flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
          >
            <RotateCcw className="w-4 h-4" /> Reset View
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="mt-2 flex items-center gap-1 text-sm text-white bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={toggleMaterial}
            className="mt-2 flex items-center gap-1 text-sm text-white bg-gray-700 hover:bg-gray-800 px-2 py-1 rounded"
          >
            <Eye className="w-4 h-4" /> {useGrayMaterial ? 'Use Texture' : 'Gray Material'}
          </button>
        </div>
      )}

      <button
        onClick={() => setShowLayerPanel(!showLayerPanel)}
        className="absolute top-4 left-4 z-20 bg-white/10 backdrop-blur px-2 py-1 rounded text-sm"
      >
        {showLayerPanel ? 'Hide Panel' : 'Show Panel'}
      </button>
    </div>
  );
}
