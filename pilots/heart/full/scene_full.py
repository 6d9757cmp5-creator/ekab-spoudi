"""Build medically cautious 3D lesson frames on existing HRA models. No simulated cardiac kinematics."""
import runpy, os, math, bpy
from mathutils import Vector
base=os.path.join(os.path.dirname(__file__),'..','scene.py')
env=runpy.run_path(base,run_name='__main__')
heart=env['heart'];lungs=env['lungs'];root=env['root'];cam=env['cam'];scene=env['scene'];aim=env['aim'];outdir=env['output'];red=env['red']
base_mat=bpy.data.materials.new('Subdued cardiac tissue')
base_mat.diffuse_color=(.31,.07,.11,1);base_mat.use_nodes=True
base_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.30,.085,.11,1)
gold=bpy.data.materials.new('Structure highlighted')
gold.diffuse_color=(.95,.62,.16,1);gold.use_nodes=True
gold.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.95,.54,.13,1)
gold.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.38
root.animation_data_clear()
for o in lungs:o.hide_render=True
# Compute center for a close-up with correct imported 3D coordinates.
bpy.context.view_layer.update()
corners=[o.matrix_world @ Vector(v) for o in heart for v in o.bound_box]
lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)))
hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
target=(lo+hi)*.5
span=max(hi[i]-lo[i] for i in range(3))
if span<=0:raise RuntimeError('Heart bounds are invalid')
cam.data.type='ORTHO'
cam.data.ortho_scale=span*1.85
cam.location=target+Vector((span*1.8,-span*2.4,span*.75))
aim(cam,target)
modes={
 'heart': lambda n:False,
 'right': lambda n:'right_atrium' in n or 'right_ventricle' in n,
 'left': lambda n:'left_atrium' in n or 'left_ventricle' in n,
 'valves': lambda n: 'valve' in n
}
for key,test in modes.items():
    matches=[o for o in heart if test(o.name.lower())]
    if key!='heart' and not matches:raise RuntimeError('Missing 3D structures for '+key)
    print('ANATOMY_PARTS',key,len(matches),'|',', '.join(o.name for o in matches[:8]))
    for o in heart:
        o.data.materials.clear()
        o.data.materials.append(gold if o in matches else (red if key=='heart' else base_mat))
    for i in range(1,13):
        root.rotation_euler=(0,0,math.radians(-9+(i-1)*18/11))
        bpy.context.view_layer.update()
        scene.frame_set(1)
        scene.render.filepath=os.path.join(outdir,'detail_%s_%04d.png'%(key,i))
        bpy.ops.render.render(write_still=True)
print('FULL_HEART_3D_FRAMES_COMPLETE')
