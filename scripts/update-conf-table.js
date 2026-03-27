const fs = require('fs');

let content = fs.readFileSync('src/components/World/Furniture.tsx', 'utf8');

// Ensure import is there
if (!content.includes('@react-three/csg')) {
    content = content.replace('import { Text, Text3D, Center } from "@react-three/drei";', 'import { Text, Text3D, Center } from "@react-three/drei";\nimport { Geometry, Base, Addition } from "@react-three/csg";');
}

// Extract old render block
const oldRender = `
    >
      {/* Main Rectangular Table Top — lab surface */}
      <mesh
        ref={surfaceRef}
        position={[0, 4, 0]}
        castShadow
        receiveShadow
        material={offWhiteMaterial}
        onUpdate={(self) => {
          self.layers.enable(1); // Enable Layer 1 for raycasting
        }}
      >
        <boxGeometry args={[40, 0.8, 20]} />
      </mesh>

      {/* Center Placing Area */}
      <mesh ref={centerRef} position={[0, 4.4, 0]} visible={false}>
        <boxGeometry args={[34, 0.1, 6]} />
      </mesh>

      {/* North Pads */}
      {[-15, 0, 15].map((x, i) => (
        <ConferencePad
          key={\`pad-n-\${i}\`}
          position={[x, 4.425, -6.5]}
          baseId={
            userData?.id ? \`\${userData.id}-north-\${i}\` : \`conf-north-\${i}\`
          }
          baseName={
            userData?.name ? \`\${userData.name} North \${i}\` : \`Conf North \${i}\`
          }
        />
      ))}

      {/* South Pads */}
      {[-15, 0, 15].map((x, i) => (
        <ConferencePad
          key={\`pad-s-\${i}\`}
          position={[x, 4.425, 6.5]}
          rotation={Math.PI}
          baseId={
            userData?.id ? \`\${userData.id}-south-\${i}\` : \`conf-south-\${i}\`
          }
          baseName={
            userData?.name ? \`\${userData.name} South \${i}\` : \`Conf South \${i}\`
          }
        />
      ))}

      {/* East Pad */}
      <ConferencePad
        position={[16, 4.425, 0]}
        rotation={-Math.PI / 2}
        baseId={userData?.id ? \`\${userData.id}-east\` : \`conf-east\`}
        baseName={userData?.name ? \`\${userData.name} East\` : \`Conf East\`}
      />

      {/* West Pad */}
      <ConferencePad
        position={[-16, 4.425, 0]}
        rotation={Math.PI / 2}
        baseId={userData?.id ? \`\${userData.id}-west\` : \`conf-west\`}
        baseName={userData?.name ? \`\${userData.name} West\` : \`Conf West\`}
      />

      {/* Table Legs */}
      <mesh position={[-15, 2, -7.5]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
      </mesh>
      <mesh position={[15, 2, -7.5]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
      </mesh>
      <mesh position={[-15, 2, 7.5]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
      </mesh>
      <mesh position={[15, 2, 7.5]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
      </mesh>
      {children}
    </group>
`;

const newRender = `
    >
      {/* PERFECT PERFORMANCE: 1 Draw Call for the entire table using CSG */}
      <mesh
        ref={surfaceRef}
        castShadow
        receiveShadow
        onUpdate={(self) => {
          self.layers.enable(1); // Enable Layer 1 for raycasting
        }}
      >
        <Geometry useGroups>
          <Base position={[0, 4, 0]} material={offWhiteMaterial}>
            <boxGeometry args={[40, 0.8, 20]} />
          </Base>
          
          <Addition position={[-15, 2, -7.5]} material={metalMaterial}>
            <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
          </Addition>
          <Addition position={[15, 2, -7.5]} material={metalMaterial}>
            <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
          </Addition>
          <Addition position={[-15, 2, 7.5]} material={metalMaterial}>
            <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
          </Addition>
          <Addition position={[15, 2, 7.5]} material={metalMaterial}>
            <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
          </Addition>
        </Geometry>
      </mesh>

      {/* Center Placing Area */}
      <mesh ref={centerRef} position={[0, 4.4, 0]} visible={false}>
        <boxGeometry args={[34, 0.1, 6]} />
      </mesh>

      {/* North Pads */}
      {[-15, 0, 15].map((x, i) => (
        <ConferencePad
          key={\`pad-n-\${i}\`}
          position={[x, 4.425, -6.5]}
          baseId={
            userData?.id ? \`\${userData.id}-north-\${i}\` : \`conf-north-\${i}\`
          }
          baseName={
            userData?.name ? \`\${userData.name} North \${i}\` : \`Conf North \${i}\`
          }
        />
      ))}

      {/* South Pads */}
      {[-15, 0, 15].map((x, i) => (
        <ConferencePad
          key={\`pad-s-\${i}\`}
          position={[x, 4.425, 6.5]}
          rotation={Math.PI}
          baseId={
            userData?.id ? \`\${userData.id}-south-\${i}\` : \`conf-south-\${i}\`
          }
          baseName={
            userData?.name ? \`\${userData.name} South \${i}\` : \`Conf South \${i}\`
          }
        />
      ))}

      {/* East Pad */}
      <ConferencePad
        position={[16, 4.425, 0]}
        rotation={-Math.PI / 2}
        baseId={userData?.id ? \`\${userData.id}-east\` : \`conf-east\`}
        baseName={userData?.name ? \`\${userData.name} East\` : \`Conf East\`}
      />

      {/* West Pad */}
      <ConferencePad
        position={[-16, 4.425, 0]}
        rotation={Math.PI / 2}
        baseId={userData?.id ? \`\${userData.id}-west\` : \`conf-west\`}
        baseName={userData?.name ? \`\${userData.name} West\` : \`Conf West\`}
      />

      {children}
    </group>
`;

content = content.replace(oldRender, newRender);

fs.writeFileSync('src/components/World/Furniture.tsx', content, 'utf8');
console.log("Replaced!");
