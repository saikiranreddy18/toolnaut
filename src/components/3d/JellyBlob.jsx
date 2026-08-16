import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const JellyBlob = ({ scale = 1 }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const blobRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create jelly blob geometry
    const geometry = new THREE.IcosahedronGeometry(1 * scale, 6);

    // Create custom material with gooey effect
    const material = new THREE.MeshPhongMaterial({
      color: 0x6366ff,
      emissive: 0x4f46e5,
      shininess: 100,
      wireframe: false,
    });

    const blob = new THREE.Mesh(geometry, material);
    scene.add(blob);
    blobRef.current = blob;

    // Store original positions for morphing
    const positionAttribute = geometry.getAttribute('position');
    const originalPositions = new Float32Array(positionAttribute.array);

    // Add lighting
    const light1 = new THREE.PointLight(0x6366ff, 1, 100);
    light1.position.set(5, 5, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xec4899, 0.8, 100);
    light2.position.set(-5, -5, 5);
    scene.add(light2);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Mouse tracking for interaction
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', onMouseMove);

    // Animation loop
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.001;

      // Morph the blob
      const positions = positionAttribute.array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = originalPositions[i];
        const y = originalPositions[i + 1];
        const z = originalPositions[i + 2];

        const displacement =
          Math.sin(x * 5 + time) * 0.1 +
          Math.cos(y * 5 + time) * 0.1 +
          Math.sin(z * 5 + time) * 0.1;

        positions[i] = x + x * displacement;
        positions[i + 1] = y + y * displacement;
        positions[i + 2] = z + z * displacement;
      }
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();

      // Rotation with mouse interaction
      blob.rotation.x += (mouseY * 0.5 - blob.rotation.x) * 0.05;
      blob.rotation.y += (mouseX * 0.5 - blob.rotation.y) * 0.05;
      blob.rotation.z += time * 0.1;

      // Scale pulsing effect
      const scale = 1 + Math.sin(time * 2) * 0.1;
      blob.scale.set(scale, scale, scale);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [scale]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: '#6366ff',
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 10,
        }}
      >
        🫧 Jelly Blob 3D
        <br />
        Move mouse to interact
      </div>
    </div>
  );
};

export default JellyBlob;
