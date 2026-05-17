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
      // Spreadsheet might have been deleted
      PropertiesService.getScriptProperties().deleteProperty('SPREADSHEET_ID');
    }
  }

  if (!ss) {
    // Attempt to find or create the spreadsheet
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

  var sheet = ss.getSheetByName("users");
  if (!sheet) {
    sheet = ss.insertSheet("users");
    sheet.appendRow(["username", "password", "created_at", "profile", "socials", "stats", "activity", "notes", "streak"]);
  }
  
  return sheet;
}

function findUserRow(sheet, username) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().toLowerCase() === username.toLowerCase()) {
      return i + 1; // 1-based index
    }
  }
  return -1;
}

function doPost(e) {
  var output = { status: 'error', error: 'Unknown action' };
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var sheet = getSheet();

    if (action === 'signup') {
      var row = findUserRow(sheet, params.username);
      if (row !== -1) {
        output = { error: 'Username already exists' };
      } else {
        var defaultProfile = { display_name: params.username, verified: true };
        var defaultStats = { xp: { score: 0, level: 1, watch_time_seconds: 0 } };
        sheet.appendRow([
          params.username,
          params.password, // Storing plaintext for demo purposes
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
      var row = findUserRow(sheet, params.username);
      if (row === -1) {
        output = { error: 'Invalid username or password' };
      } else {
        var userPassword = sheet.getRange(row, 2).getValue();
        if (userPassword === params.password) {
          
          // Update streak
          var streakDataStr = sheet.getRange(row, 9).getValue();
          var streakData = streakDataStr ? JSON.parse(streakDataStr) : { dates: [] };
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
      var row = findUserRow(sheet, params.username);
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
      var row = findUserRow(sheet, params.username);
      if (row !== -1) {
        sheet.getRange(row, 5).setValue(JSON.stringify(params.socials || {}));
        output = { status: 'success' };
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'updateProfileXp') {
      var row = findUserRow(sheet, params.username);
      if (row !== -1) {
        var statsStr = sheet.getRange(row, 6).getValue();
        var stats = statsStr ? JSON.parse(statsStr) : { xp: { score: 0, level: 1 } };
        
        var streakStr = sheet.getRange(row, 9).getValue();
        var streakObj = streakStr ? JSON.parse(streakStr) : { dates: [] };
        
        if (!stats.xp) stats.xp = { score: 0, level: 1, watch_time_seconds: 0 };

        // Advanced XP Formula logic
        // score += (w * 0.02) * multiplier * min(1/(1 + e^((score//3600)*(score-15))), 1) + (min(w//1800, 1) * x1)
        var w = params.watch_time_seconds || 0;
        var s = streakObj.dates.length || 0;
        var currentScore = stats.xp.score || 0;
        var x1 = Math.floor(Math.random() * 60);
        
        var multiplier = (Math.min(s - 1, 16) * 1.05);
        if (multiplier < 1) multiplier = 1; // Ensure multiplier is at least 1

        // Sigmoid-like decay component
        var sigmoidTerm = 1 / (1 + Math.exp((Math.floor(currentScore / 3600)) * (currentScore - 15)));
        var decayFactor = Math.min(sigmoidTerm, 1);
        
        var bonusTerm = (Math.floor(w / 1800) >= 1 ? 1 : 0) * x1;
        
        var xpGain = (w * 0.02) * multiplier * decayFactor + bonusTerm;
        xpGain = Math.max(0, Math.floor(xpGain)); // Ensure non-negative integer

        stats.xp.score += xpGain;
        stats.xp.watch_time_seconds = (stats.xp.watch_time_seconds || 0) + w;
        
        // Leveling: Each level is 100 XP
        stats.xp.level = Math.floor(stats.xp.score / 100) + 1;
        stats.xp.next_level_at = stats.xp.level * 100;
        stats.xp.progress = stats.xp.score % 100;
        stats.xp.level_threshold = 100;

        sheet.getRange(row, 6).setValue(JSON.stringify(stats));

        // Update recently watched activity
        var activityStr = sheet.getRange(row, 7).getValue();
        var activity = activityStr ? JSON.parse(activityStr) : [];
        // Remove existing if same video
        activity = activity.filter(function(v) { return v.reference_id !== params.video_id; });
        activity.unshift({
           id: new Date().getTime(),
           reference_id: params.video_id,
           title: params.title || "Video",
           subtitle: params.channel_title || "Channel",
           status: "Watched"
        });
        if (activity.length > 10) activity.pop();
        sheet.getRange(row, 7).setValue(JSON.stringify(activity));

        output = { status: 'success', xp_earned: xpGain };
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'saveNotes') {
      var row = findUserRow(sheet, params.username);
      if (row !== -1) {
        var notesStr = sheet.getRange(row, 8).getValue();
        var notes = notesStr ? JSON.parse(notesStr) : [];
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

    if (action === 'getProfile') {
      var row = findUserRow(sheet, params.username);
      if (row !== -1) {
        var profileStr = sheet.getRange(row, 4).getValue();
        var socialsStr = sheet.getRange(row, 5).getValue();
        output = {
          status: 'success',
          username: params.username,
          profile: profileStr ? JSON.parse(profileStr) : {},
          socials: socialsStr ? JSON.parse(socialsStr) : {}
        };
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'getProfileStats') {
      var row = findUserRow(sheet, params.username);
      if (row !== -1) {
        var statsStr = sheet.getRange(row, 6).getValue();
        var activityStr = sheet.getRange(row, 7).getValue();
        var notesStr = sheet.getRange(row, 8).getValue();
        var streakStr = sheet.getRange(row, 9).getValue();

        var stats = statsStr ? JSON.parse(statsStr) : {};
        var activity = activityStr ? JSON.parse(activityStr) : [];
        var notes = notesStr ? JSON.parse(notesStr) : [];
        var streak = streakStr ? JSON.parse(streakStr) : { dates: [] };

        if (!stats.panels) stats.panels = {};
        stats.panels.recently_watched = activity;
        stats.panels.recent_notes = notes.slice(-5).map(function(n) {
           return { id: n.video_id, reference_id: n.video_id, title: n.title, subtitle: 'Note', status: 'Saved' };
        });
        stats.streak = streak.dates.length;

        output = stats;
        output.status = 'success';
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'getNotes') {
      var row = findUserRow(sheet, params.username);
      if (row !== -1) {
        var notesStr = sheet.getRange(row, 8).getValue();
        output = notesStr ? JSON.parse(notesStr) : [];
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'getNote') {
      var row = findUserRow(sheet, params.username);
      if (row !== -1) {
        var notesStr = sheet.getRange(row, 8).getValue();
        var notes = notesStr ? JSON.parse(notesStr) : [];
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
      var row = findUserRow(sheet, params.username);
      if (row !== -1) {
        var streakStr = sheet.getRange(row, 9).getValue();
        output = streakStr ? JSON.parse(streakStr) : { dates: [] };
        output.status = 'success';
      } else { output = { error: 'User not found' }; }
    }
    else if (action === 'getLeaderboard') {
      var data = sheet.getDataRange().getValues();
      var leaderboard = [];
      for (var i = 1; i < data.length; i++) {
        var uname = data[i][0];
        if (!uname) continue;
        var pStr = data[i][3];
        var sStr = data[i][5];
        var profile = pStr ? JSON.parse(pStr) : {};
        var stats = sStr ? JSON.parse(sStr) : {};
        
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
      output = leaderboard;
    }

  } catch (err) {
    output = { status: 'error', error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}
