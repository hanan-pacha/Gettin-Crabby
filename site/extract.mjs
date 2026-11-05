import { stationsById } from "@neaps/tide-database";
import fs from "fs";
// [noaa id, display name, area, region group, species]
const L = [
 ["8574680","Baltimore Inner Harbor","Chesapeake Bay, MD","Chesapeake","blue"],
 ["8575512","Annapolis","Chesapeake Bay, MD","Chesapeake","blue"],
 ["8577330","Solomons Island","Patuxent River, MD","Chesapeake","blue"],
 ["8571892","Cambridge","Choptank River, MD","Chesapeake","blue"],
 ["8635750","Lewisetta","Potomac River, VA","Chesapeake","blue"],
 ["8632200","Kiptopeke","Lower Bay, VA","Chesapeake","blue"],
 ["8638610","Sewells Point","Norfolk, VA","Chesapeake","blue"],
 ["8557380","Lewes","Delaware Bay, DE","Mid-Atlantic","blue"],
 ["8536110","Cape May","Cape May, NJ","Mid-Atlantic","blue"],
 ["8534720","Atlantic City","Atlantic City, NJ","Mid-Atlantic","blue"],
 ["8531680","Sandy Hook","Raritan Bay, NJ","Mid-Atlantic","blue"],
 ["8570283","Ocean City Inlet","Ocean City, MD","Mid-Atlantic","blue"],
 ["8652587","Oregon Inlet Marina","Outer Banks, NC","Southeast","blue"],
 ["8656483","Beaufort","Beaufort, NC","Southeast","blue"],
 ["8658120","Wilmington","Cape Fear River, NC","Southeast","blue"],
 ["8665530","Charleston","Charleston Harbor, SC","Southeast","blue"],
 ["8670870","Fort Pulaski","Savannah, GA","Southeast","blue"],
 ["8720218","Mayport","Jacksonville, FL","Southeast","blue"],
 ["8726520","St. Petersburg","Tampa Bay, FL","Gulf Coast","blue"],
 ["8727520","Cedar Key","Cedar Key, FL","Gulf Coast","blue"],
 ["8728690","Apalachicola","Apalachicola Bay, FL","Gulf Coast","blue"],
 ["8735180","Dauphin Island","Mobile Bay, AL","Gulf Coast","blue"],
 ["8761724","Grand Isle","Grand Isle, LA","Gulf Coast","blue"],
 ["8771450","Galveston Pier 21","Galveston Bay, TX","Gulf Coast","blue"],
 ["8774770","Rockport","Aransas Bay, TX","Gulf Coast","blue"],
 ["9414290","San Francisco","SF Bay, CA","Pacific","dungeness"],
 ["9415020","Point Reyes","Marin Coast, CA","Pacific","dungeness"],
 ["9418767","North Spit","Humboldt Bay, CA","Pacific","dungeness"],
 ["9419750","Crescent City","Crescent City, CA","Pacific","dungeness"],
 ["9432780","Charleston","Coos Bay, OR","Pacific","dungeness"],
 ["9435380","South Beach","Yaquina Bay, OR","Pacific","dungeness"],
 ["9437540","Garibaldi","Tillamook Bay, OR","Pacific","dungeness"],
 ["9439040","Astoria","Columbia River, OR","Pacific","dungeness"],
 ["9440910","Toke Point","Willapa Bay, WA","Pacific","dungeness"],
 ["9444900","Port Townsend","Puget Sound, WA","Pacific","dungeness"],
 ["9447130","Seattle","Elliott Bay, WA","Pacific","dungeness"],
 ["9449880","Friday Harbor","San Juan Islands, WA","Pacific","dungeness"],
];
const out=[];
for (const [id,name,area,group,sp] of L){
  const s=stationsById.get("noaa/"+id);
  if(!s){console.log("MISSING",id,name);continue;}
  if(s.type!=="reference"||!s.harmonic_constituents?.length){console.log("NOT REF",id,name,s.type);continue;}
  const off=(s.datums.MSL-s.datums.MLLW);
  out.push({id,name,area,group,sp,lat:+s.latitude.toFixed(4),lon:+s.longitude.toFixed(4),tz:s.timezone,
    off:+off.toFixed(4),gt:+(s.datums.GT ?? (s.datums.MHHW-s.datums.MLLW)).toFixed(3),
    hc:s.harmonic_constituents.filter(c=>c.amplitude>0.002).map(c=>[c.name,+c.amplitude.toFixed(4),+c.phase.toFixed(2)])});
}
fs.writeFileSync("stations.json",JSON.stringify(out));
console.log(out.length, fs.statSync("stations.json").size);
