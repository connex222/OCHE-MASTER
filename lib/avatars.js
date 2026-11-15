'use strict';
// Bible §3b: canonical OCHE cast. IDs and filenames never depend on player names.
const AVATARS = Object.freeze([
  Object.freeze({"id":"big_kev","name":"Kevin Kowalski","nickname":"Big Kev the Kebab","tagline":"A kebab in one hand, a dart in the other.","file":"avatar_01_big_kev.png","call":"Big Kev... the Kebab!","voiceKey":"walkon_big_kev"}),
  Object.freeze({"id":"bounce_out_barry","name":"Barry Braithwaite","nickname":"Bounce-Out","tagline":"He'll get one to stick eventually.","file":"avatar_02_bounce_out_barry.png","call":"Barry... Bounce-Out... Braithwaite!","voiceKey":"walkon_bounce_out_barry"}),
  Object.freeze({"id":"double_trouble","name":"Derek Dobbs","nickname":"Double Trouble","tagline":"Two darts, one very serious look.","file":"avatar_03_double_trouble.png","call":"Derek... Double Trouble... Dobbs!","voiceKey":"walkon_double_trouble"}),
  Object.freeze({"id":"the_mullet","name":"Malcolm McGinty","nickname":"The Mullet","tagline":"Business at the oche. Party at the back.","file":"avatar_04_the_mullet.png","call":"Malcolm... The Mullet... McGinty!","voiceKey":"walkon_the_mullet"}),
  Object.freeze({"id":"wobbly_wayne","name":"Wayne Wainwright","nickname":"Wobbly","tagline":"Shaky hands. Unshakable ambition.","file":"avatar_05_wobbly_wayne.png","call":"Wayne... Wobbly... Wainwright!","voiceKey":"walkon_wobbly_wayne"}),
  Object.freeze({"id":"sir_arrows","name":"Stanley Ollerenshaw","nickname":"Sir Arrows","tagline":"Eighty-five years of finding the double.","file":"avatar_06_sir_arrows.png","call":"Stanley... Sir Arrows... Ollerenshaw!","voiceKey":"walkon_sir_arrows"}),
  Object.freeze({"id":"the_gladiator","name":"Gary Grimshaw","nickname":"The Gladiator","tagline":"More sparkle than a trophy cabinet.","file":"avatar_07_the_gladiator.png","call":"Gary... The Gladiator... Grimshaw!","voiceKey":"walkon_the_gladiator"}),
  Object.freeze({"id":"nigel_bust","name":"Nigel Bottomley","nickname":"Bust","tagline":"Dangerous at both ends of the scoreboard.","file":"avatar_08_nigel_bust.png","call":"Nigel... Bust... Bottomley!","voiceKey":"walkon_nigel_bust"}),
  Object.freeze({"id":"the_shark","name":"Sharon Shufflebottom","nickname":"The Shark","tagline":"A friendly smile. A ruthless finish.","file":"avatar_09_the_shark.png","call":"Sharon... The Shark... Shufflebottom!","voiceKey":"walkon_the_shark"}),
  Object.freeze({"id":"bullseye_brenda","name":"Brenda Bagshaw","nickname":"Bullseye","tagline":"Knits between turns. Never misses a stitch.","file":"avatar_10_bullseye_brenda.png","call":"Brenda... Bullseye... Bagshaw!","voiceKey":"walkon_bullseye_brenda"}),
  Object.freeze({"id":"treble_tap_tina","name":"Tina Tattersall","nickname":"Treble Tap","tagline":"Cool under pressure. Sharp at the trebles.","file":"avatar_11_treble_tap_tina.png","call":"Tina... Treble Tap... Tattersall!","voiceKey":"walkon_treble_tap_tina"}),
  Object.freeze({"id":"dinner_lady","name":"Doreen Duckworth","nickname":"The Dinner Lady","tagline":"Finish your plate. Then your checkout.","file":"avatar_12_dinner_lady.png","call":"Doreen... The Dinner Lady... Duckworth!","voiceKey":"walkon_dinner_lady"}),
]);
const BY_ID = Object.freeze(Object.fromEntries(AVATARS.map(a => [a.id, a])));
function freeAvatars(players) {
  const used = new Set(players.map(p => p.avatarId).filter(Boolean));
  return AVATARS.filter(a => !used.has(a.id));
}
module.exports = { AVATARS, BY_ID, freeAvatars };
