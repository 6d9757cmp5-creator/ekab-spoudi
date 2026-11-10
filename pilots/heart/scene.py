# Preview-only Blender scene. NOT a clinical simulation or anatomical validator.
# Input models: HuBMAP HRA v1.2, CC BY 4.0 (see ATTRIBUTION.md).
import bpy, math, os, sys
from mathutils import Vector

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
repo=args[0] if args else os.getcwd()
output=args[1] if len(args)>1 else '/tmp/heart_frames'
os.makedirs(output,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def import_gltf(name):
    path=os.path.join(os.environ.get('HRA_PREVIEW_MODEL_DIR',os.path.join(repo,'tools/anatomy-3d/resources/hra-v1.2/thorax')),name)
    if not os.path.isfile(path): raise FileNotFoundError(path)
    old=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in old and o.type=='MESH']

lungs=import_gltf('VH_F_Lung.glb')
heart=import_gltf('VH_F_Heart.glb')
assert lungs and heart, 'Imported models have no meshes'
def anatomy_material(color,opacity=1.0,metallic=0.02,roughness=0.52):
    m=bpy.data.materials.new('Heart material' if opacity==1 else 'Translucent lung')
    m.diffuse_color=(*color,opacity);m.use_nodes=True
    nodes=m.node_tree.nodes;links=m.node_tree.links
    p=nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=roughness
    p.inputs['Metallic'].default_value=metallic
    if opacity<1:
        transparent=nodes.new('ShaderNodeBsdfTransparent')
        mix=nodes.new('ShaderNodeMixShader')
        mix.inputs[0].default_value=opacity
        links.new(transparent.outputs[0],mix.inputs[1])
        links.new(p.outputs[0],mix.inputs[2])
        out=nodes.get('Material Output')
        links.new(mix.outputs[0],out.inputs['Surface'])
    return m
red=anatomy_material((0.67,0.16,0.19),1,0.0,0.44)
blue=anatomy_material((0.33,0.62,0.79),0.16,0.0,0.55)
for mesh in heart:
    mesh.data.materials.clear();mesh.data.materials.append(red)
for mesh in lungs:
    mesh.data.materials.clear();mesh.data.materials.append(blue)
meshes=heart+lungs
# Organ-coordinate registration is preserved: both are from the same HRA female dataset.
corners=[ob.matrix_world @ Vector(v) for ob in meshes for v in ob.bound_box]
mins=Vector(tuple(min(c[i] for c in corners) for i in range(3)))
maxs=Vector(tuple(max(c[i] for c in corners) for i in range(3)))
centre=(mins+maxs)/2
size=max(maxs[i]-mins[i] for i in range(3))
if not (size>0): raise RuntimeError('Invalid model bounds')
root=bpy.data.objects.new('Anatomy group',None)
bpy.context.collection.objects.link(root)
for ob in meshes:
    world=ob.matrix_world.copy()
    ob.parent=root
    ob.matrix_world=world
root.scale=(2.95/size,)*3
root.location=(-centre.x*root.scale[0],-centre.y*root.scale[1],-centre.z*root.scale[2])
def aim(o,target):
    direction=Vector(target)-o.location
    o.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
world=bpy.context.scene.world
world.color=(0.022,0.032,0.055)
world.use_nodes=True
bg=world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(0.016,0.027,0.055,1);bg.inputs['Strength'].default_value=0.28
def area(name,loc,power,color):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=4
    ob=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(ob)
    ob.location=loc;aim(ob,(0,0,0))
area('Medical key',(-3,-4,5),750,(1.0,.8,.78))
area('Cool rim',(3,2,3),950,(.48,.7,1.0))
area('Front fill',(1,-4,0),400,(.9,.93,1.0))
camdata=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',camdata)
bpy.context.collection.objects.link(cam);bpy.context.scene.camera=cam
cam.location=(4,-5,2.2);aim(cam,(0,0,0))
cam.data.type='ORTHO';cam.data.ortho_scale=4.45
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=8
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.render.use_file_extension=True
scene.render.engine='CYCLES'
scene.view_settings.view_transform='Standard'
scene.frame_start=1;scene.frame_end=60
scene.render.fps=10
# Model rotates smoothly; NO invented heart-beat / valve kinematics.
root.rotation_euler=(0,0,math.radians(-13))
root.keyframe_insert(data_path='rotation_euler',frame=1)
root.rotation_euler=(0,0,math.radians(13))
root.keyframe_insert(data_path='rotation_euler',frame=60)
for curve in root.animation_data.action.fcurves:
    for point in curve.keyframe_points:point.interpolation='BEZIER'
for f in range(1,61):
    scene.frame_set(f)
    scene.render.filepath=os.path.join(output,'frame_%04d.png'%f)
    bpy.ops.render.render(write_still=True)
print('BLENDER_PREVIEW_COMPLETE frames=60')
