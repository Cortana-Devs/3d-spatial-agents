const fs = require('fs');

let content = fs.readFileSync('src/components/World/Furniture.tsx', 'utf8');

const oldRender = `
    >
      {/* Heavy workbench top — industrial epoxy surface */}
      <mesh
        position={[0, topHeight, 0]}
        castShadow
        receiveShadow
        material={darkSlateMaterial}
        onUpdate={(self) => {
          self.layers.enable(1); // Enable Layer 1 for raycasting
        }}
      >
        <boxGeometry args={[benchWidth, topThickness, benchDepth]} />
      </mesh>

      {/* Front edge trim — bright accent strip */}
      <mesh position={[0, topHeight, benchDepth / 2 + 0.05]} castShadow material={accentGreenMaterial}>
        <boxGeometry args={[benchWidth, topThickness * 0.6, 0.1]} />
      </mesh>

      {/* Placing area slots (invisible) */}
      <mesh ref={slotLeftRef} position={[-16, topHeight + 0.4, 0]} visible={false}>
        <boxGeometry args={[14, 0.1, 5]} />
      </mesh>
      <mesh ref={slotMidRef} position={[0, topHeight + 0.4, 0]} visible={false}>
        <boxGeometry args={[14, 0.1, 5]} />
      </mesh>
      <mesh ref={slotRightRef} position={[16, topHeight + 0.4, 0]} visible={false}>
        <boxGeometry args={[14, 0.1, 5]} />
      </mesh>

      {/* Steel H-frame legs */}
      {[
        [-benchWidth / 2 + 1.5, -benchDepth / 2 + 1],
        [benchWidth / 2 - 1.5, -benchDepth / 2 + 1],
        [-benchWidth / 2 + 1.5, benchDepth / 2 - 1],
        [benchWidth / 2 - 1.5, benchDepth / 2 - 1],
      ].map(([x, z], i) => (
        <mesh
          key={\`wbleg-\${i}\`}
          position={[x, (topHeight - topThickness / 2) / 2, z]}
          castShadow
          material={metalMaterial}
        >
          <boxGeometry args={[1, topHeight - topThickness / 2, 1]} />
        </mesh>
      ))}
      {/* Center support legs */}
      {[
        [0, -benchDepth / 2 + 1],
        [0, benchDepth / 2 - 1],
      ].map(([x, z], i) => (
        <mesh
          key={\`wbleg-c-\${i}\`}
          position={[x, (topHeight - topThickness / 2) / 2, z]}
          castShadow
          material={metalMaterial}
        >
          <boxGeometry args={[1, topHeight - topThickness / 2, 1]} />
        </mesh>
      ))}

      {children}
    </group>
`;

const newRender = `
    >
      {/* CSG OPTIMIZED: 1 Draw Call for the entire Lab Workbench */}
      <mesh
        castShadow
        receiveShadow
        onUpdate={(self) => {
          self.layers.enable(1); // Enable Layer 1 for raycasting
        }}
      >
        <Geometry useGroups>
          {/* Top Surface */}
          <Base position={[0, topHeight, 0]} material={darkSlateMaterial}>
            <boxGeometry args={[benchWidth, topThickness, benchDepth]} />
          </Base>

          {/* Front edge trim */}
          <Addition position={[0, topHeight, benchDepth / 2 + 0.05]} material={accentGreenMaterial}>
            <boxGeometry args={[benchWidth, topThickness * 0.6, 0.1]} />
          </Addition>

          {/* Steel H-frame legs */}
          {[
            [-benchWidth / 2 + 1.5, -benchDepth / 2 + 1],
            [benchWidth / 2 - 1.5, -benchDepth / 2 + 1],
            [-benchWidth / 2 + 1.5, benchDepth / 2 - 1],
            [benchWidth / 2 - 1.5, benchDepth / 2 - 1],
            [0, -benchDepth / 2 + 1],
            [0, benchDepth / 2 - 1],
          ].map(([x, z], i) => (
            <Addition
              key={\`wbleg-csg-\${i}\`}
              position={[x, (topHeight - topThickness / 2) / 2, z]}
              material={metalMaterial}
            >
              <boxGeometry args={[1, topHeight - topThickness / 2, 1]} />
            </Addition>
          ))}
        </Geometry>
      </mesh>

      {/* Placing area slots (invisible) */}
      <mesh ref={slotLeftRef} position={[-16, topHeight + 0.4, 0]} visible={false}>
        <boxGeometry args={[14, 0.1, 5]} />
      </mesh>
      <mesh ref={slotMidRef} position={[0, topHeight + 0.4, 0]} visible={false}>
        <boxGeometry args={[14, 0.1, 5]} />
      </mesh>
      <mesh ref={slotRightRef} position={[16, topHeight + 0.4, 0]} visible={false}>
        <boxGeometry args={[14, 0.1, 5]} />
      </mesh>

      {children}
    </group>
`;

if (content.includes('Heavy workbench top — industrial epoxy surface')) {
    content = content.replace(oldRender, newRender);
    fs.writeFileSync('src/components/World/Furniture.tsx', content, 'utf8');
    console.log("LabWorkbench Replaced!");
} else {
    console.log("Could not find exact text");
}
