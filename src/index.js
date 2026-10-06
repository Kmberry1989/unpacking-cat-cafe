import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';

// --- CONFIGURATION & DATA ---
const levelData = {
    id: "foyer_02",
    itemsInBox: [
        { id: "espresso_machine", model: "item_espresso_machine.glb", type: "box", color: 0x4a4e69, size: [0.8, 0.8, 0.6], validSurfaces: ["surface_desk"], sound: "sfx_drop_heavy" },
        { id: "potted_plant", model: "item_potted_plant.glb", type: "cylinder", color: 0x4caf50, size: [0.3, 0.3, 0.8], validSurfaces: ["surface_desk", "surface_shelf"], sound: "sfx_drop_wood" },
        { id: "pastry_display", model: "item_pastry_display.glb", type: "box", color: 0xffddaa, size: [1.2, 0.6, 0.6], validSurfaces: ["surface_table"], sound: "sfx_drop_glass" },
        { id: "cat_tree", model: "item_cat_tree.glb", type: "box", color: 0xc19a6b, size: [0.8, 1.8, 0.8], validSurfaces: ["surface_floor"], isCatTarget: true, sound: "sfx_drop_heavy" },
        { id: "yarn_ball", model: "item_yarn_ball.glb", type: "sphere", color: 0xff66b2, size: [0.25, 16, 16], validSurfaces: ["surface_floor", "surface_table"], isCatTarget: true, sound: "sfx_drop_soft" },
        { id: "cat_bed_mint", model: "item_cat_bed_mint.glb", type: "box", color: 0xb5e3d8, size: [0.8, 0.2, 0.8], validSurfaces: ["surface_floor"], isCatTarget: true, sound: "sfx_drop_soft" }
    ]
};

// --- STATE MANAGEMENT ---
let gameState = "UNPACKING";
let placedItems = [];
let itemsRemaining = levelData.itemsInBox.length;
let boxMesh = null; // Global reference to the box for animations

// --- SCENE & RENDERER SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfaf3f0);

const aspect = window.innerWidth / window.innerHeight;
const d = 6; 
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

// --- LOADERS & HELPERS ---
const gltfLoader = new GLTFLoader();

function setItemGlow(item, hexColor) {
    if (!item) return;
    item.traverse((child) => {
        if (child.isMesh && child.material && child.material.emissive) {
            child.material.emissive.setHex(hexColor);
        }
    });
}

function generateProceduralModel(data) {
    let geo;
    const type = data.type || "box";
    const size = data.size || [0.5, 0.5, 0.5];
    const color = data.color || 0xcccccc;

    if (type === "box") geo = new THREE.BoxGeometry(...size);
    else if (type === "cylinder") geo = new THREE.CylinderGeometry(...size);
    else if (type === "sphere") geo = new THREE.SphereGeometry(...size);
    
    geo.translate(0, (geo.parameters.height || geo.parameters.radius || size[1]) / 2, 0);

    const mat = new THREE.MeshLambertMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    
    const group = new THREE.Group();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    
    return group;
}

// --- ENVIRONMENT SETUP ---
const roomGroup = new THREE.Group();
scene.add(roomGroup);

// Helper to load static environment objects with procedural fallbacks
function loadEnvProp(fileName, position, surfaceTag, fallbackFunc, isBox = false) {
    gltfLoader.load(
        `/assets/models/${fileName}`,
        (gltf) => {
            const model = gltf.scene;
            model.position.copy(position);
            
            if (isBox) {
                model.name = "prop_box_cardboard";
                boxMesh = model;
            }
            
            // Tag all inner meshes so the raycaster detects the surface type
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (surfaceTag) child.userData = { surfaceType: surfaceTag };
                }
            });
            
            if (surfaceTag) model.userData = { surfaceType: surfaceTag };
            roomGroup.add(model);
        },
        undefined,
        (error) => {
            console.warn(`[Fallback] Missing environment file: ${fileName}`);
            const fallbackModel = fallbackFunc();
            fallbackModel.position.copy(position);
            
            if (surfaceTag) fallbackModel.userData = { surfaceType: surfaceTag };
            if (isBox) {
                fallbackModel.name = "prop_box_cardboard";
                boxMesh = fallbackModel;
            }
            
            roomGroup.add(fallbackModel);
        }
    );
}

// 1. Load Floor
loadEnvProp('env_room_foyer.glb', new THREE.Vector3(0, 0, 0), "surface_floor", () => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshLambertMaterial({ color: 0xead1ba }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
});

// 2. Load Desk
loadEnvProp('prop_desk_reception.glb', new THREE.Vector3(0, 0.5, -2), "surface_desk", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.5), new THREE.MeshLambertMaterial({ color: 0x8ab6d6 }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
});

// 3. Load Table
loadEnvProp('env_cafe_table.glb', new THREE.Vector3(2, 0.4, 1.5), "surface_table", () => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8, 16), new THREE.MeshLambertMaterial({ color: 0xd4a373 }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
});

// 4. Load Shelf
loadEnvProp('env_wall_shelf.glb', new THREE.Vector3(-3, 2.5, -1), "surface_shelf", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.6), new THREE.MeshLambertMaterial({ color: 0xa68a64 }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
});

// 5. Load the Box
loadEnvProp('prop_box_cardboard.glb', new THREE.Vector3(-2, 0.5, 2), null, () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), new THREE.MeshLambertMaterial({ color: 0xd2a679 }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}, true);


// --- HTML UI ---
const uiContainer = document.createElement('div');
uiContainer.style.position = 'absolute';
uiContainer.style.top = '0';
uiContainer.style.left = '0';
uiContainer.style.width = '100%';
uiContainer.style.height = '100%';
uiContainer.style.pointerEvents = 'none';
document.body.appendChild(uiContainer);

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
rotateBtn.style.pointerEvents = 'auto';
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
    
    setItemGlow(heldItem, 0x000000);
    
    for (let hit of hits) {
        let isSelf = false;
        hit.object.traverseAncestors((ancestor) => { if (ancestor === heldItem) isSelf = true; });
        if (hit.object === heldItem || isSelf) continue;

        const surfaceType = hit.object.userData?.surfaceType;
        if (surfaceType && currentItemData.validSurfaces.includes(surfaceType)) {
            isValidPlacement = true;
            setItemGlow(heldItem, 0x222222); 
            break;
        }
    }
};

const onTouchStart = (event) => {
    if (gameState !== "UNPACKING" || isRotating || event.target === rotateBtn) return;

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

// --- ANIMATION & SPAWNING ---
function spawnItemFromBox(startPos) {
    currentItemData = levelData.itemsInBox.pop();
    itemsRemaining--;
    counterUI.innerText = `📦 Items in box: ${itemsRemaining}`;

    const finalizeSpawn = (model) => {
        model.position.copy(startPos);
        model.userData = { id: currentItemData.id, isCatTarget: currentItemData.isCatTarget };
        roomGroup.add(model);
        heldItem = model;

        new TWEEN.Tween(model.position)
            .to({ y: 3 }, 250)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        movePlane.constant = -3; 
    };

    if (currentItemData.model) {
        gltfLoader.load(
            `/assets/models/${currentItemData.model}`,
            (gltf) => {
                const model = gltf.scene;
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                finalizeSpawn(model);
            },
            undefined,
            (error) => {
                console.warn(`[Fallback] Could not load ${currentItemData.model}`);
                finalizeSpawn(generateProceduralModel(currentItemData));
            }
        );
    } else {
        finalizeSpawn(generateProceduralModel(currentItemData));
    }
}

function dropItem(item) {
    const downRay = new THREE.Raycaster();
    const itemWorldPos = new THREE.Vector3();
    item.getWorldPosition(itemWorldPos);
    downRay.set(itemWorldPos, new THREE.Vector3(0, -1, 0));
    
    const hits = downRay.intersectObjects(roomGroup.children, true);
    const validHits = hits.filter(h => {
        let isSelf = false;
        h.object.traverseAncestors((anc) => { if(anc === item) isSelf = true; });
        return h.object !== item && !isSelf;
    });
    
    const targetY = validHits[0] ? validHits[0].point.y : 0;
    
    const localTarget = new THREE.Vector3(0, targetY, 0);
    roomGroup.worldToLocal(localTarget);

    setItemGlow(item, 0x000000);

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
    setItemGlow(item, 0x000000);
    
    // Safety check in case the box hasn't loaded properly for some reason
    const boxPos = boxMesh ? boxMesh.position : new THREE.Vector3(-2, 0.5, 2);
    
    new TWEEN.Tween(item.position)
        .to({ x: boxPos.x, y: boxPos.y, z: boxPos.z }, 300)
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

// --- REWARD PHASE ---
function checkLevelComplete() {
    if (itemsRemaining === 0) {
        gameState = "REWARD";
        rotateBtn.style.opacity = "0.5";
        rotateBtn.style.pointerEvents = "none";
        counterUI.innerText = "✨ Room Complete! ✨";
        
        if (boxMesh) roomGroup.remove(boxMesh); 
        
        const targets = placedItems.filter(item => item.userData.isCatTarget);
        
        targets.forEach((target, index) => {
            setTimeout(() => spawnCatForTarget(target), 500 + (index * 800));
        });
    }
}

function spawnCatForTarget(targetItem) {
    const catColors = [0xffaa00, 0x333333, 0xffffff];
    const catColor = catColors[Math.floor(Math.random() * catColors.length)];
    
    const catGeo = new THREE.CapsuleGeometry(0.3, 0.4, 4, 8);
    catGeo.translate(0, 0.35, 0); 
    const catMesh = new THREE.Mesh(catGeo, new THREE.MeshLambertMaterial({ color: catColor }));
    catMesh.castShadow = true;
    
    const catGroup = new THREE.Group();
    catGroup.add(catMesh);
    
    catGroup.position.set(4, 0, 4); 
    roomGroup.add(catGroup);

    catGroup.lookAt(targetItem.position);
    
    const waddle = new TWEEN.Tween(catGroup.rotation)
        .to({ z: 0.2 }, 150)
        .yoyo(true)
        .repeat(Infinity)
        .easing(TWEEN.Easing.Quadratic.InOut);
    waddle.start();

    const dist = catGroup.position.distanceTo(targetItem.position);
    const walkTime = dist * 800; 

    new TWEEN.Tween(catGroup.position)
        .to({ x: targetItem.position.x, z: targetItem.position.z }, walkTime)
        .easing(TWEEN.Easing.Linear.None)
        .onComplete(() => {
            waddle.stop();
            catGroup.rotation.z = 0;
            
            new TWEEN.Tween(catGroup.position)
                .to({ y: targetItem.position.y }, 200)
                .yoyo(true)
                .repeat(1)
                .onComplete(() => {
                    catGroup.rotation.x = Math.PI / 2; 
                    catGroup.position.y = targetItem.position.y + 0.1;
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