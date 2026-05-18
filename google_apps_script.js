/**
 * EduForge - Google Apps Script Backend
 * 
 * 1. Go to https://script.google.com/ and create a new project.
 * 2. Paste this code into Code.gs.
 * 3. Deploy > New deployment > Select "Web app".
 * 4. Execute as "Me", Who has access "Anyone".
 * 5. Copy the Web App URL and paste it into your `src/config.js` (API_BASE_URL).
 * 
 * Prerequisites:
 * You must have a Google Sheet named "users" in your Drive. If it doesn't exist,
 * this script will attempt to create it upon first use.
 * 
 * Columns (A-I):
 * A: username | B: password | C: created_at | D: profile | E: socials | F: stats | G: activity | H: notes | I: streak
 */

function getSheet() {
  var spreadSheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var ss;
  
  if (spreadSheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadSheetId);
    } catch (e) {
      PropertiesService.getScriptProperties().deleteProperty('SPREADSHEET_ID');
    }
  }

  if (!ss) {
    var files = DriveApp.searchFiles("title = 'EduForge_Database' and mimeType = '" + MimeType.GOOGLE_SHEETS + "'");
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create("EduForge_Database");
      var sheet = ss.getActiveSheet();
      sheet.setName("users");
      sheet.appendRow(["username", "password", "created_at", "profile", "socials", "stats", "activity", "notes", "streak"]);
    }
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  }

  return ss.getSheetByName("users");
}

/**
 * Optimized User Lookup using a Map for caching within the execution context.
 */
var userCache = null;
function getUserData(sheet) {
  if (userCache) return userCache;
  var data = sheet.getDataRange().getValues();
  userCache = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      userCache[data[i][0].toString().toLowerCase()] = { row: i + 1, data: data[i] };
    }
  }
  return userCache;
}

function findUserRow(sheet, username) {
  var users = getUserData(sheet);
  var user = users[username.toLowerCase()];
  return user ? user.row : -1;
}

function doPost(e) {
  var output = { status: 'error', error: 'Unknown action' };
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var sheet = getSheet();
    var row = findUserRow(sheet, params.username || "");

    if (action === 'signup') {
      if (row !== -1) {
        output = { error: 'Username already exists' };
      } else {
        var defaultProfile = { display_name: params.username, verified: true };
        var defaultStats = { xp: { score: 0, level: 1, watch_time_seconds: 0 } };
        sheet.appendRow([
          params.username,
          params.password,
          new Date().toISOString(),
          JSON.stringify(defaultProfile),
          "{}",
          JSON.stringify(defaultStats),
          "[]",
          "[]",
          JSON.stringify({ dates: [new Date().toISOString().split('T')[0]] })
        ]);
        output = { status: 'success', message: 'User created' };
      }
    } 
    else if (action === 'login') {
      if (row === -1) {
        output = { error: 'Invalid username or password' };
      } else {
        var userData = getUserData(sheet)[params.username.toLowerCase()].data;
        var storedPassword = userData[1] != null ? userData[1].toString() : "";
        var providedPassword = params.password != null ? params.password.toString() : "";
        
        if (storedPassword === providedPassword) {
          // Batch updates to decrease write frequency
          var streakData = userData[8] ? JSON.parse(userData[8]) : { dates: [] };
          var today = new Date().toISOString().split('T')[0];
          if (!streakData.dates.includes(today)) {
             streakData.dates.push(today);
             sheet.getRange(row, 9).setValue(JSON.stringify(streakData));
          }
          output = { status: 'success', message: 'Logged in' };
        } else {
          output = { error: 'Invalid username or password' };
        }
      }
    }
    else if (action === 'updateProfile') {
      if (row !== -1) {
        var profileData = {
          username: params.username,
          display_name: params.display_name,
          bio: params.bio,
          role_title: params.role_title,
          profile_image_url: params.profile_image_url,
          location: params.location,
          timezone: params.timezone,
          website: params.website,
          skills: params.skills
        };
        sheet.getRange(row, 4).setValue(JSON.stringify(profileData));
        output = { status: 'success', profile: profileData };
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'updateSocials') {
      if (row !== -1) {
        sheet.getRange(row, 5).setValue(JSON.stringify(params.socials || {}));
        output = { status: 'success' };
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'updateProfileXp') {
      if (row !== -1) {
        var userData = getUserData(sheet)[params.username.toLowerCase()].data;
        var stats = userData[5] ? JSON.parse(userData[5]) : { xp: { score: 0, level: 1 } };
        var streakObj = userData[8] ? JSON.parse(userData[8]) : { dates: [] };
        
        if (!stats.xp) stats.xp = { score: 0, level: 1, watch_time_seconds: 0 };

        var w = params.watch_time_seconds || 0;
        var s = streakObj.dates.length || 0;
        var currentScore = stats.xp.score || 0;
        var x1 = Math.floor(Math.random() * 60);
        
        var multiplier = (Math.min(s - 1, 16) * 1.05);
        if (multiplier < 1) multiplier = 1;

        var sigmoidTerm = 1 / (1 + Math.exp((Math.floor(currentScore / 3600)) * (currentScore - 15)));
        var decayFactor = Math.min(sigmoidTerm, 1);
        var bonusTerm = (Math.floor(w / 1800) >= 1 ? 1 : 0) * x1;
        var xpGain = Math.max(0, Math.floor((w * 0.02) * multiplier * decayFactor + bonusTerm));

        stats.xp.score += xpGain;
        stats.xp.watch_time_seconds = (stats.xp.watch_time_seconds || 0) + w;
        stats.xp.level = Math.floor(stats.xp.score / 100) + 1;
        stats.xp.next_level_at = stats.xp.level * 100;
        stats.xp.progress = stats.xp.score % 100;
        stats.xp.level_threshold = 100;

        // Recently watched activity batching
        var activity = userData[6] ? JSON.parse(userData[6]) : [];
        activity = activity.filter(function(v) { return v.reference_id !== params.video_id; });
        activity.unshift({
           id: new Date().getTime(),
           reference_id: params.video_id,
           title: params.title || "Video",
           subtitle: params.channel_title || "Channel",
           status: "Watched"
        });
        if (activity.length > 10) activity.pop();

        // Optimized Write: Single call for multiple columns if possible? 
        // GAS getRange(row, column, numRows, numColumns).setValues() is faster.
        // We write stats (6) and activity (7) together.
        sheet.getRange(row, 6, 1, 2).setValues([[JSON.stringify(stats), JSON.stringify(activity)]]);

        output = { status: 'success', xp_earned: xpGain };
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'saveNotes') {
      if (row !== -1) {
        var userData = getUserData(sheet)[params.username.toLowerCase()].data;
        var notes = userData[7] ? JSON.parse(userData[7]) : [];
        var existingIndex = notes.findIndex(function(n) { return n.video_id === params.video_id; });
        
        var newNote = {
          video_id: params.video_id,
          title: params.title || 'Untitled Note',
          content: params.content,
          updated_at: new Date().toISOString()
        };

        if (existingIndex !== -1) {
          notes[existingIndex] = newNote;
        } else {
          notes.push(newNote);
        }

        sheet.getRange(row, 8).setValue(JSON.stringify(notes));
        output = { status: 'success' };
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'generateRoadmap') {
      var groqApiKey = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
      if (!groqApiKey) {
        output = { error: 'Groq API key not configured in ScriptProperties' };
      } else {
        var skill = params.skill;
        var url = "https://api.groq.com/openai/v1/chat/completions";
        
        var prompt = "Create a professional, highly detailed learning roadmap for '" + skill + "' in JSON format.\n" +
                     "For each node, provide exactly 2 high-quality resources:\n" +
                     "1. One 'video' resource: Search for a verified, highly-rated YouTube video and return its full URL. Ensure the video title is accurate.\n" +
                     "2. One 'article' resource: Provide a link to official documentation (e.g., MDN, Python.org) or a top-tier tutorial site (e.g., freeCodeCamp).\n" +
                     "Constraint: Max 8 nodes. Output ONLY the JSON object.\n" +
                     "Format: { \"nodes\": [{\"id\": \"1\", \"label\": \"Topic\", \"resources\": [{\"type\": \"video\", \"title\": \"...\", \"url\": \"...\"}, {\"type\": \"article\", \"title\": \"...\", \"url\": \"...\"}]}], \"edges\": [{\"id\": \"e1-2\", \"source\": \"1\", \"target\": \"2\"}] }.";

        var payload = {
          messages: [
            { role: "system", content: "You are an expert educator. Return only valid JSON." },
            { role: "user", content: prompt }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          max_tokens: 3000,
          response_format: { type: "json_object" }
        };
        
        var response = UrlFetchApp.fetch(url, {
          method: "post",
          headers: {
            "Authorization": "Bearer " + groqApiKey,
            "Content-Type": "application/json"
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
        
        var responseCode = response.getResponseCode();
        var responseText = response.getContentText();
        
        if (responseCode !== 200) {
          output = { error: "Groq API Error (" + responseCode + "): " + responseText };
        } else {
          var result = JSON.parse(responseText);
          var roadmapData = JSON.parse(result.choices[0].message.content);
          
          roadmapData.nodes = roadmapData.nodes.map(function(n, idx) {
            var row = Math.floor(idx / 3);
            var col = idx % 3;
            var xPos, yPos;
            
            if (row % 2 === 0) {
              xPos = col * 350; // Left to Right
            } else {
              xPos = (2 - col) * 350; // Right to Left
            }
            yPos = row * 250;

            n.position = { x: xPos, y: yPos };
            n.type = 'default';
            n.data = { label: n.label, resources: n.resources || [] };
            return n;
          });
          
          output = { status: 'success', roadmap: roadmapData };
        }
      }
    }
    else if (action === 'saveRoadmap') {
      if (row !== -1) {
        var userData = getUserData(sheet)[params.username.toLowerCase()].data;
        var existingRoadmaps = userData[9] ? JSON.parse(userData[9]) : [];
        if (!Array.isArray(existingRoadmaps)) {
           existingRoadmaps = existingRoadmaps ? [existingRoadmaps] : [];
        }

        var newRoadmap = params.roadmap;
        newRoadmap.id = newRoadmap.id || new Date().getTime();
        newRoadmap.title = params.title || params.skill || "Untitled Roadmap";
        newRoadmap.updated_at = new Date().toISOString();

        var index = existingRoadmaps.findIndex(function(r) { return r.id === newRoadmap.id; });
        if (index !== -1) {
          existingRoadmaps[index] = newRoadmap;
        } else {
          existingRoadmaps.push(newRoadmap);
        }

        var lastCol = sheet.getLastColumn();
        if (lastCol < 10) {
           sheet.getRange(1, 10).setValue("roadmaps");
        }
        sheet.getRange(row, 10).setValue(JSON.stringify(existingRoadmaps));
        output = { status: 'success', roadmaps: existingRoadmaps };
      } else { output = { error: 'User not found' }; }
    }

  } catch (err) {
    output = { status: 'error', error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var output = { status: 'error', error: 'Unknown action' };
  try {
    var params = e.parameter;
    var action = params.action;
    var sheet = getSheet();
    var userDataMap = getUserData(sheet);

    if (action === 'getProfile') {
      var user = userDataMap[params.username.toLowerCase()];
      if (user) {
        output = {
          status: 'success',
          username: params.username,
          profile: user.data[3] ? JSON.parse(user.data[3]) : {},
          socials: user.data[4] ? JSON.parse(user.data[4]) : {}
        };
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'ping') {
      output = { status: 'success', message: 'pong' };
    }
    else if (action === 'getProfileStats') {
      var user = userDataMap[params.username.toLowerCase()];
      if (user) {
        var stats = user.data[5] ? JSON.parse(user.data[5]) : {};
        var activity = user.data[6] ? JSON.parse(user.data[6]) : [];
        var notes = user.data[7] ? JSON.parse(user.data[7]) : [];
        var streak = user.data[8] ? JSON.parse(user.data[8]) : { dates: [] };
        var roadmaps = user.data[9] ? JSON.parse(user.data[9]) : [];

        if (!stats.panels) stats.panels = {};
        stats.panels.recently_watched = activity;
        stats.panels.recent_notes = notes.slice(-5).map(function(n) {
           return { id: n.video_id, reference_id: n.video_id, title: n.title, subtitle: 'Note', status: 'Saved' };
        });
        stats.panels.roadmaps = Array.isArray(roadmaps) ? roadmaps : (roadmaps ? [roadmaps] : []);
        stats.streak = streak.dates.length;

        output = stats;
        output.status = 'success';
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'getNotes') {
      var user = userDataMap[params.username.toLowerCase()];
      if (user) {
        output = user.data[7] ? JSON.parse(user.data[7]) : [];
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'getNote') {
      var user = userDataMap[params.username.toLowerCase()];
      if (user) {
        var notes = user.data[7] ? JSON.parse(user.data[7]) : [];
        var note = notes.find(function(n) { return n.video_id === params.videoId; });
        if (note) {
          output = note;
          output.status = 'success';
        } else {
          output = { error: 'Note not found' };
        }
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'getStreak') {
      var user = userDataMap[params.username.toLowerCase()];
      if (user) {
        output = user.data[8] ? JSON.parse(user.data[8]) : { dates: [] };
        output.status = 'success';
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'getRoadmap') {
      var user = userDataMap[params.username.toLowerCase()];
      if (user) {
        output = {
          status: 'success',
          roadmap: user.data[9] ? JSON.parse(user.data[9]) : null
        };
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'getLeaderboard') {
      // Use Spreadsheet Cache for Leaderboard as it's expensive
      var cache = CacheService.getScriptCache();
      var cachedLeaderboard = cache.get("leaderboard_data");
      if (cachedLeaderboard) {
        return ContentService.createTextOutput(cachedLeaderboard).setMimeType(ContentService.MimeType.JSON);
      }

      var data = sheet.getDataRange().getValues();
      var leaderboard = [];
      for (var i = 1; i < data.length; i++) {
        var uname = data[i][0];
        if (!uname) continue;
        var profile = data[i][3] ? JSON.parse(data[i][3]) : {};
        var stats = data[i][5] ? JSON.parse(data[i][5]) : {};
        
        leaderboard.push({
          username: uname,
          display_name: profile.display_name || uname,
          profile_image_url: profile.profile_image_url || "",
          role_title: profile.role_title || "Learner",
          xp_score: (stats.xp && stats.xp.score) ? stats.xp.score : 0,
          level: (stats.xp && stats.xp.level) ? stats.xp.level : 1
        });
      }
      
      leaderboard.sort(function(a, b) { return b.xp_score - a.xp_score; });
      var responseText = JSON.stringify(leaderboard);
      cache.put("leaderboard_data", responseText, 60); // Cache for 60 seconds
      output = leaderboard;
    }

  } catch (err) {
    output = { status: 'error', error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}
