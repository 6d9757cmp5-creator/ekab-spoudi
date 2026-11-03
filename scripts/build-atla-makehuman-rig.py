#!/usr/bin/env python3
"""Build a demonstrator rigged MakeHuman patient from local CC0 source geometry.
Run with Blender Python: blender -b -t 2 --python scripts/build-atla-makehuman-rig.py
The result is an educational animation demonstrator, NOT an anatomical/clinical certificate.
"""
import bpy
import json
import hashlib
import math
from pathlib import Path
from mathutils import Vector

ROOT=Path("tools/patient-simulator/resources/makehuman")
OUT=Path("tools/patient-simulator/assets/patients")
OBJ=ROOT/"base.obj"
SKEL=ROOT/"rigs/default.mhskel"
WEIGHTS=ROOT/"rigs/default_weights.mhw"

def read_verified(path, manifest):
    obj=json.loads(Path(manifest).read_text())
    candidates=obj.get("assets",obj.get("files",[]))
    entry=next((x for x in candidates if x.get("path")==str(path)),None)
    if not entry: raise RuntimeError(f"No pinned source manifest: {path}")
    data=path.read_bytes()
    if len(data)!=entry.get("size",entry.get("bytes")): raise RuntimeError(f"Byte length changed: {path}")
    if hashlib.sha256(data).hexdigest()!=entry["sha256"]:raise RuntimeError(f"SHA256 source mismatch: {path}")
    return data
raw=read_verified(OBJ,ROOT/"imported-manifest.json")
raw_skel=read_verified(SKEL,ROOT/"supplemental-imported-manifest.json")
raw_weights=read_verified(WEIGHTS,ROOT/"supplemental-imported-manifest.json")
skel=json.loads(raw_skel)
weights=json.loads(raw_weights)["weights"]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
verts=[]
faces=[]
for line in raw.decode("utf-8").splitlines():
    if line.startswith("v "):
        fields=line.split()
        if len(fields)<4:raise RuntimeError("Invalid OBJ coordinate")
        verts.append(tuple(float(a) for a in fields[1:4]))
    elif line.startswith("f "):
        face=[int(v.split("/")[0])-1 for v in line.split()[1:]]
        if len(face)>=3:faces.append(tuple(face))
if len(verts)<10000 or len(faces)<10000:
    raise RuntimeError(f"Unexpectedly small MakeHuman mesh: {len(verts)} verts {len(faces)} faces")
if any(min(f)<0 or max(f)>=len(verts) for f in faces):
    raise RuntimeError("OBJ index out of range")
mesh=bpy.data.meshes.new("MakeHuman_CC0_body")
mesh.from_pydata(verts,[],faces)
mesh.update(calc_edges=True)
body=bpy.data.objects.new("ATLA_MakeHuman_body",mesh)
bpy.context.collection.objects.link(body)
material=bpy.data.materials.new("Neutral educational skin")
material.diffuse_color=(0.69,0.54,0.45,1)
mesh.materials.append(material)
if material.use_nodes:
    bsdf=material.node_tree.nodes.get("Principled BSDF")
    if bsdf:bsdf.inputs["Base Color"].default_value=material.diffuse_color
arm_data=bpy.data.armatures.new("MakeHuman_original_CC0_skeleton")
arm=bpy.data.objects.new("ATLA_rigged_educational_avatar",arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm
arm.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
edit_bones={}
for name,definition in skel["bones"].items():
    def point(field):
        joint=definition[field]
        indexes=skel["joints"].get(joint)
        if not indexes:raise RuntimeError("Unknown rig landmark "+joint)
        if min(indexes)<0 or max(indexes)>=len(verts):raise RuntimeError("Invalid rig vertex landmarks "+joint)
        return Vector(tuple(sum(verts[k][j] for k in indexes)/len(indexes) for j in range(3)))
    head,tail=point("head"),point("tail")
    if (tail-head).length<0.001:tail=head+Vector((0,0.01,0))
    bone=arm_data.edit_bones.new(name)
    bone.head=head;bone.tail=tail
    edit_bones[name]=bone
for name,definition in skel["bones"].items():
    parent=definition.get("parent")
    if parent and parent in edit_bones:
        edit_bones[name].parent=edit_bones[parent]
        edit_bones[name].use_connect=False
bpy.ops.object.mode_set(mode="OBJECT")
bone_names=set(skel["bones"])
assigned_vertices=set()
assigned_weights=0
for name,pairs in weights.items():
    if name not in bone_names:continue
    group=body.vertex_groups.new(name=name)
    for vertex,weight in pairs:
        if not isinstance(vertex,int) or vertex<0 or vertex>=len(verts):
            raise RuntimeError("Weight vertex out of range "+name)
        weight=float(weight)
        if not math.isfinite(weight) or weight<0 or weight>1.00001:raise RuntimeError("Unsafe skin weight")
        if weight>0:
            group.add([vertex],min(weight,1.0),"ADD")
            assigned_weights+=1
            assigned_vertices.add(vertex)
coverage=len(assigned_vertices)/len(verts)
if coverage<0.86 or len(edit_bones)<130:
    raise RuntimeError(f"Not enough original skinning evidence: {coverage:.1%}, bones={len(edit_bones)}")
modifier=body.modifiers.new("Original MakeHuman skinning","ARMATURE")
modifier.object=arm
body.parent=arm
arm.show_in_front=False
bpy.context.view_layer.objects.active=arm
arm.select_set(True)
if not arm.animation_data:arm.animation_data_create()

# Procedural educational motion is intentionally non-clinical. We do not
# retarget walk1.bvh blindly because its joint hierarchy may differ from this rig.
def create_action(label, motion):
    action=bpy.data.actions.new(label)
    arm.animation_data.action=action
    for bone in arm.pose.bones:
        bone.rotation_mode="XYZ"
        bone.rotation_euler=(0,0,0)
    for frame in (1,16,31,46,61):
        t=(frame-1)/60
        for name,axis,scale,phase in motion:
            p=arm.pose.bones.get(name)
            if p:
                value=scale*math.sin(t*math.pi*2+phase)
                p.rotation_euler[axis]=value
                p.keyframe_insert(data_path="rotation_euler",frame=frame,group=name)
    track=arm.animation_data.nla_tracks.new()
    track.name=label
    strip=track.strips.new(label,1,action)
    strip.action_frame_start=1;strip.action_frame_end=61
    return action

create_action("ATLA_idle_subtle_motion",[
 ("spine02",0,0.018,0),("spine03",0,0.009,0.2),
 ("clavicle.L",2,0.006,0),("clavicle.R",2,-0.006,0)
])
create_action("ATLA_movement_study_not_clinical_gait",[
 ("upperleg01.L",0,0.18,0),("upperleg01.R",0,0.18,math.pi),
 ("lowerleg01.L",0,0.10,math.pi/2),("lowerleg01.R",0,0.10,-math.pi/2),
 ("upperarm01.L",0,0.09,math.pi),("upperarm01.R",0,0.09,0)
])
arm.animation_data.action=None
bpy.context.scene.frame_start=1
bpy.context.scene.frame_end=61
OUT.mkdir(parents=True,exist_ok=True)
filename=OUT/"atla-makehuman-rigged-educational.glb"
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=str(filename),export_format="GLB",use_selection=True,
    export_animations=True,export_nla_strips=True,export_yup=True,export_apply=False)
generated=filename.read_bytes()
if generated[:4]!=b"glTF" or len(generated)<100000:
    raise RuntimeError("Generated GLB does not have valid glTF 2.0 header and minimum size")
output={
 "source":"CC0 MakeHuman base OBJ, skeleton, weights; procedural motion by ATLA",
 "license":"CC0-1.0",
 "warning":"Skinned and animated demonstration only. Not physiologically responsive or clinically validated.",
 "assets":[{
   "name":filename.name,
   "path":str(filename),
   "size":len(generated),
   "sha256":hashlib.sha256(generated).hexdigest(),
   "bones":len(edit_bones),
   "sourceVertices":len(verts),
   "sourceFaces":len(faces),
   "skinnedCoverage":round(coverage,5),
   "animations":2,
   "clinicalStatus":"EDUCATIONAL_DEMONSTRATOR_UNVERIFIED"
 }]
}
(OUT/"atla-makehuman-rigged-manifest.json").write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n")
print("ATLA_RIGGED_SOURCE_BUILD",json.dumps(output))
