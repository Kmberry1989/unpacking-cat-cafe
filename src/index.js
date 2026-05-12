import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';

// --- CONFIGURATION & DATA ---
// Expanded level data with procedural shapes for rapid prototyping
const levelData = {
    id: "foyer_02",
    itemsInBox: [
        { id: "espresso_machine", type: "box", color: 0x4a4e69, size: [0.8, 0.8, 0.6], validSurfaces: ["surface_desk"], sound: "sfx_drop_heavy" },
        { id: "potted_plant", type: "cylinder", color: 0x4caf50, size: [0.3, 0.3, 0.8], validSurfaces: ["surface_desk", "surface_shelf"], sound: "sfx_drop_wood" },
        { id: "pastry_display", type: "box", color: 0xffddaa, size: [1.2, 0.6, 0.6], validSurfaces: ["surface_table"], sound: "sfx_drop_glass" },
        { id: "cat_tree", type: "box", color: 0xc19a6b, size: [0.8, 1.8, 0.8], validSurfaces: ["surface_floor"], isCatTarget: true, sound: "sfx_drop_heavy" },
        { id: "yarn_ball", type: "sphere", color: 0xff66b2, size: [0.25, 16, 16], validSurfaces: ["surface_floor", "surface_table"], isCatTarget: true, sound: "sfx_drop_soft" },
        { id: "cat_bed_mint", type: "box", color: 0xb5e3d8, size: [0.8, 0.2, 0.8], validSurfaces: ["surface_floor"], isCatTarget: true, sound: "sfx_drop_soft" }
    ]
};

// --- STATE MANAGEMENT ---
let gameState = "UNPACKING";
let placedItems = [];
let itemsRemaining = levelData.itemsInBox.length;

// --- SCENE & RENDERER SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfaf3f0);

const aspect = window.innerWidth / window.innerHeight;
const d = 6; // Pulled camera back slightly for a wider room
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeaeb, 0.8);
dirLight.position.set(5, 12, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

// --- ENVIRONMENT SETUP ---
const roomGroup = new THREE.Group();
scene.add(roomGroup);

// 1. Floor
const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshLambertMaterial({ color: 0xead1ba }));
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.receiveShadow = true;
floorMesh.userData = { surfaceType: "surface_floor" };
roomGroup.add(floorMesh);

// 2. Main Desk
const deskMesh = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.5), new THREE.MeshLambertMaterial({ color: 0x8ab6d6 }));
deskMesh.position.set(0, 0.5, -2);
deskMesh.castShadow = true;
deskMesh.receiveShadow = true;
deskMesh.userData = { surfaceType: "surface_desk" };
roomGroup.add(deskMesh);

// 3. Cafe Round Table
const tableMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8, 16), new THREE.MeshLambertMaterial({ color: 0xd4a373 }));
tableMesh.position.set(2, 0.4, 1.5);
tableMesh.castShadow = true;
tableMesh.receiveShadow = true;
tableMesh.userData = { surfaceType: "surface_table" };
roomGroup.add(tableMesh);

// 4. Wall Shelf (Floating)
const shelfMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.6), new THREE.MeshLambertMaterial({ color: 0xa68a64 }));
shelfMesh.position.set(-3, 2.5, -1);
shelfMesh.castShadow = true;
shelfMesh.receiveShadow = true;
shelfMesh.userData = { surfaceType: "surface_shelf" };
roomGroup.add(shelfMesh);

// 5. Unpacking Box
const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), new THREE.MeshLambertMaterial({ color: 0xd2a679 }));
boxMesh.position.set(-2, 0.5, 2);
boxMesh.castShadow = true;
boxMesh.receiveShadow = true;
boxMesh.name = "prop_box_cardboard";
roomGroup.add(boxMesh);

// --- HTML UI ---
const uiContainer = document.createElement('div');
uiContainer.style.position = 'absolute';
uiContainer.style.top = '0';
uiContainer.style.left = '0';
uiContainer.style.width = '100%';
uiContainer.style.height = '100%';
uiContainer.style.pointerEvents = 'none'; // Let clicks pass through
document.body.appendChild(uiContainer);

// Counter UI
const counterUI = document.createElement('div');
counterUI.style.position = 'absolute';
counterUI.style.top = '20px';
counterUI.style.left = '20px';
counterUI.style.padding = '10px 15px';
counterUI.style.backgroundColor = 'white';
counterUI.style.borderRadius = '15px';
counterUI.style.fontFamily = 'sans-serif';
counterUI.style.fontWeight = 'bold';
counterUI.style.color = '#333';
counterUI.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
counterUI.innerText = `📦 Items in box: ${itemsRemaining}`;
uiContainer.appendChild(counterUI);

// Rotation Button
const rotateBtn = document.createElement('button');
rotateBtn.innerText = "↻ Rotate Room";
rotateBtn.style.position = 'absolute';
rotateBtn.style.bottom = '30px';
rotateBtn.style.right = '30px';
rotateBtn.style.padding = "15px 20px";
rotateBtn.style.borderRadius = "25px";
rotateBtn.style.border = "none";
rotateBtn.style.backgroundColor = "#ffb3ba";
rotateBtn.style.color = "#fff";
rotateBtn.style.fontWeight = "bold";
rotateBtn.style.fontSize = "16px";
rotateBtn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
rotateBtn.style.cursor = "pointer";
rotateBtn.style.pointerEvents = 'auto'; // Re-enable clicks for button
uiContainer.appendChild(rotateBtn);

let isRotating = false;
rotateBtn.addEventListener('click', () => {
    if (isRotating || gameState !== "UNPACKING") return;
    isRotating = true;
    new TWEEN.Tween(roomGroup.rotation)
        .to({ y: roomGroup.rotation.y + (Math.PI / 2) }, 400)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onComplete(() => { isRotating = false; })
        .start();
});

// --- INTERACTION LOGIC ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let heldItem = null;
let currentItemData = null;
let movePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1);
let isValidPlacement = false;

const onTouchMove = (event) => {
    if (gameState !== "UNPACKING" || isRotating) return;

    const x = event.touches ? event.touches[0].clientX : event.clientX;
    const y = event.touches ? event.touches[0].clientY : event.clientY;
    
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    if (heldItem) {
        raycaster.setFromCamera(mouse, camera);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(movePlane, intersectPoint);
        roomGroup.worldToLocal(intersectPoint);
        heldItem.position.lerp(intersectPoint, 0.2);
        checkPlacementValidity();
    }
};

const checkPlacementValidity = () => {
    const downRay = new THREE.Raycaster();
    const itemWorldPos = new THREE.Vector3();
    heldItem.getWorldPosition(itemWorldPos);
    downRay.set(itemWorldPos, new THREE.Vector3(0, -1, 0));
    
    const hits = downRay.intersectObjects(roomGroup.children, true);
    isValidPlacement = false;
    
    // Reset tint
    heldItem.material.emissive.setHex(0x000000);
    
    for (let hit of hits) {
        if (hit.object === heldItem) continue;
        const surfaceType = hit.object.userData?.surfaceType;
        if (surfaceType && currentItemData.validSurfaces.includes(surfaceType)) {
            isValidPlacement = true;
            heldItem.material.emissive.setHex(0x222222); // Slight glow when over valid spot
            break;
        }
    }
};

const onTouchStart = (event) => {
    if (gameState !== "UNPACKING" || isRotating || event.target === rotateBtn) return;

    // Set move plane to the height of the touch for dragging
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(roomGroup.children, true);
    
    const boxHit = intersects.find(hit => hit.object.name === "prop_box_cardboard");
    if (boxHit && itemsRemaining > 0 && !heldItem) {
        spawnItemFromBox(boxHit.object.position);
    }
};

const onTouchEnd = () => {
    if (heldItem) {
        if (isValidPlacement) {
            dropItem(heldItem);
        } else {
            rejectItem(heldItem);
        }
    }
};

// --- ANIMATION CONTROLLERS ---
function generateProceduralModel(data) {
    let geo;
    if (data.type === "box") geo = new THREE.BoxGeometry(...data.size);
    else if (data.type === "cylinder") geo = new THREE.CylinderGeometry(...data.size);
    else if (data.type === "sphere") geo = new THREE.SphereGeometry(...data.size);
    
    // Shift geometry origin so the bottom is at y=0, making placement calculations trivial
    geo.translate(0, (geo.parameters.height || geo.parameters.radius) / 2, 0);

    const mat = new THREE.MeshLambertMaterial({ color: data.color });
    return new THREE.Mesh(geo, mat);
}

function spawnItemFromBox(startPos) {
    currentItemData = levelData.itemsInBox.pop();
    itemsRemaining--;
    counterUI.innerText = `📦 Items in box: ${itemsRemaining}`;

    const model = generateProceduralModel(currentItemData);
    model.position.copy(startPos);
    model.userData = { id: currentItemData.id, isCatTarget: currentItemData.isCatTarget };
    model.castShadow = true;
    model.receiveShadow = true;
    
    roomGroup.add(model);
    heldItem = model;

    // Pop out of box animation
    new TWEEN.Tween(model.position)
        .to({ y: 3 }, 250)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
        
    // Set dragging height
    movePlane.constant = -3; 
}

function dropItem(item) {
    // Because we shifted geometry origins, dropping to the surface height is just setting Y.
    // In a full build, you'd calculate the exact hit.point.y of the surface below.
    const downRay = new THREE.Raycaster();
    const itemWorldPos = new THREE.Vector3();
    item.getWorldPosition(itemWorldPos);
    downRay.set(itemWorldPos, new THREE.Vector3(0, -1, 0));
    const hits = downRay.intersectObjects(roomGroup.children, true).filter(h => h.object !== item);
    
    const targetY = hits[0] ? hits[0].point.y : 0;
    
    // Convert world Y target back to local group Y
    const localTarget = new THREE.Vector3(0, targetY, 0);
    roomGroup.worldToLocal(localTarget);

    item.material.emissive.setHex(0x000000); // Remove glow

    new TWEEN.Tween(item.position)
        .to({ y: localTarget.y }, 150)
        .easing(TWEEN.Easing.Cubic.In)
        .onComplete(() => {
            new TWEEN.Tween(item.scale)
                .to({ y: 0.7, x: 1.2, z: 1.2 }, 50)
                .yoyo(true)
                .repeat(1)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => {
                    item.scale.set(1, 1, 1);
                    placedItems.push(item);
                    heldItem = null;
                    currentItemData = null;
                    checkLevelComplete();
                })
                .start();
        })
        .start();
}

function rejectItem(item) {
    item.material.emissive.setHex(0x000000);
    
    new TWEEN.Tween(item.position)
        .to({ x: boxMesh.position.x, y: boxMesh.position.y, z: boxMesh.position.z }, 300)
        .easing(TWEEN.Easing.Bounce.Out)
        .onComplete(() => {
            roomGroup.remove(item);
            levelData.itemsInBox.push(currentItemData);
            itemsRemaining++;
            counterUI.innerText = `📦 Items in box: ${itemsRemaining}`;
            heldItem = null;
            currentItemData = null;
        })
        .start();
}

// --- REWARD PHASE (MULTIPLE CATS) ---
function checkLevelComplete() {
    if (itemsRemaining === 0) {
        gameState = "REWARD";
        rotateBtn.style.opacity = "0.5";
        rotateBtn.style.pointerEvents = "none";
        counterUI.innerText = "✨ Room Complete! ✨";
        
        roomGroup.remove(boxMesh); 
        
        // Find all placed items marked as cat targets
        const targets = placedItems.filter(item => item.userData.isCatTarget);
        
        // Spawn a cat for each target with a staggered delay
        targets.forEach((target, index) => {
            setTimeout(() => spawnCatForTarget(target), 500 + (index * 800));
        });
    }
}

function spawnCatForTarget(targetItem) {
    // Random cat color (Orange, Black, or White)
    const catColors = [0xffaa00, 0x333333, 0xffffff];
    const catColor = catColors[Math.floor(Math.random() * catColors.length)];
    
    const catGeo = new THREE.CapsuleGeometry(0.3, 0.4, 4, 8);
    // Shift origin like items so bottom is y=0
    catGeo.translate(0, 0.35, 0); 
    const catMesh = new THREE.Mesh(catGeo, new THREE.MeshLambertMaterial({ color: catColor }));
    catMesh.castShadow = true;
    
    // Spawn at the door (x=4, z=4)
    catMesh.position.set(4, 0, 4); 
    roomGroup.add(catMesh);

    catMesh.lookAt(targetItem.position);
    
    // Waddle animation
    const waddle = new TWEEN.Tween(catMesh.rotation)
        .to({ z: 0.2 }, 150)
        .yoyo(true)
        .repeat(Infinity)
        .easing(TWEEN.Easing.Quadratic.InOut);
    waddle.start();

    // Distance-based timing so they walk at a consistent speed
    const dist = catMesh.position.distanceTo(targetItem.position);
    const walkTime = dist * 800; // 800ms per unit of distance

    new TWEEN.Tween(catMesh.position)
        .to({ x: targetItem.position.x, z: targetItem.position.z }, walkTime)
        .easing(TWEEN.Easing.Linear.None)
        .onComplete(() => {
            waddle.stop();
            catMesh.rotation.z = 0;
            
            // Jump on/into target
            new TWEEN.Tween(catMesh.position)
                .to({ y: targetItem.position.y }, 200)
                .yoyo(true)
                .repeat(1)
                .onComplete(() => {
                    catMesh.rotation.x = Math.PI / 2; // Lie down
                    catMesh.position.y = targetItem.position.y + 0.1;
                })
                .start();
        })
        .start();
}

// Event Listeners
window.addEventListener('pointermove', onTouchMove, { passive: false });
window.addEventListener('pointerdown', onTouchStart, { passive: false });
window.addEventListener('pointerup', onTouchEnd, { passive: false });

window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- RENDER LOOP ---
function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);
    renderer.render(scene, camera);
}
animate();