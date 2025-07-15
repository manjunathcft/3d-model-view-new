// src/App.tsx
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Loader, RotateCcw, ZoomIn, ZoomOut, Home, Palette, Upload } from 'lucide-react';

interface AppProps {
  modelUrl?: string;
}

function App({ modelUrl }: AppProps) {
  const DEFAULT_MODEL = 'https://3dmodelsshare.s3.us-east-1.amazonaws.com/default.glb';
  const [currentModelUrl, setCurrentModelUrl] = useState(modelUrl ?? DEFAULT_MODEL);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const backgroundColors = [
    { name: 'Dark Gray', value: '#1a1a1a' },
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#ffffff' },
    { name: 'Light Gray', value: '#f5f5f5' },
    { name: 'Blue', value: '#1e40af' },
    { name: 'Green', value: '#166534' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Red', value: '#dc2626' },
  ];

  const getFileExtension = (url: string): string => {
    return url.split('.').pop()?.toLowerCase() || '';
  };

  const loadModel = (url: string) => {
    if (!sceneRef.current) return;

    setLoading(true);
    setError(null);

    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current = null;
    }

    const extension = getFileExtension(url);
    let loader: GLTFLoader | FBXLoader | OBJLoader;

    switch (extension) {
      case 'gltf':
      case 'glb':
        loader = new GLTFLoader();
        break;
      case 'fbx':
        loader = new FBXLoader();
        break;
      case 'obj':
        loader = new OBJLoader();
        break;
      default:
        setError(`Unsupported file format: .${extension}`);
        setLoading(false);
        return;
    }

    loader.load(
      url,
      (object) => {
        let model: THREE.Group;
        model = extension === 'glb' || extension === 'gltf' ? (object as any).scene : (object as THREE.Group);

        modelRef.current = model;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.setScalar(scale);

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (!child.material && extension === 'obj') {
              child.material = new THREE.MeshLambertMaterial({ color: 0x888888 });
            }
          }
        });

        sceneRef.current!.add(model);
        setLoading(false);
      },
      undefined,
      (error) => {
        setError(`Failed to load 3D model: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCurrentModelUrl(url);
    loadModel(url);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);

    loadModel(currentModelUrl);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(backgroundColor);
    }
  }, [backgroundColor]);

  const resetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0, 5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const zoomIn = () => {
    if (cameraRef.current) cameraRef.current.position.multiplyScalar(0.8);
  };

  const zoomOut = () => {
    if (cameraRef.current) cameraRef.current.position.multiplyScalar(1.2);
  };

  const toggleAutoRotate = () => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !controlsRef.current.autoRotate;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gltf,.glb,.fbx,.obj"
        onChange={handleFileUpload}
        className="hidden"
      />
      <div ref={mountRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-10">
          <Loader className="w-10 h-10 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}

export default App;
