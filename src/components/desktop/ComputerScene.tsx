"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ComputerScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      canvas.dataset.webgl = "unavailable";
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0.25, 7.4);

    const group = new THREE.Group();
    scene.add(group);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 3.9, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xc5d3e8, roughness: 0.55, metalness: 0.08 }),
    );
    group.add(frame);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(5.48, 3.58),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 }),
    );
    screen.position.z = 0.13;
    group.add(screen);
    const neck = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.75, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x9bafd3, roughness: 0.5 }),
    );
    neck.position.set(0, -2.22, -0.04);
    group.add(neck);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.16, 1.05),
      new THREE.MeshStandardMaterial({ color: 0x7591cc, roughness: 0.55 }),
    );
    base.position.set(0, -2.62, 0.12);
    group.add(base);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x5a78af, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-3, 5, 6);
    scene.add(key);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const render = (time = 0) => {
      group.rotation.y = reducedMotion ? -0.04 : -0.04 + Math.sin(time * 0.00025) * 0.025;
      group.rotation.x = 0.015;
      renderer.render(scene, camera);
      if (!reducedMotion) animationFrame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    render();
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      frame.geometry.dispose();
      screen.geometry.dispose();
      neck.geometry.dispose();
      base.geometry.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="computer-scene" aria-hidden="true" />;
}
