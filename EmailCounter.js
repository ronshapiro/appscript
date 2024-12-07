 function main() {
  const SHEET_URL = '<your URL here>';
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getSheets()[0];
  
  if (sheet.getLastRow() <= 1) {
    initializeSheet(sheet);
  }
  const [threadCount, previousAlerts] = getCurrentThreadCount();
  console.log(previousAlerts.length);
  saveThreadCount(sheet, threadCount);

  for (const lastCount of getLastThreadCounts(sheet)) {
    if (threadCount - lastCount > 10) {
      sendAlertEmail(threadCount, lastCount);
      for (const thread of previousAlerts) {
        console.log(thread);
        thread.moveToArchive();
      }
      break;
    }
  }
}

function isOurOwnEmailAlert(thread) {
  if (!thread.getFirstMessageSubject().startsWith(EMAIL_SUBJECT_PREFIX)) return false;
  return Session.getActiveUser().getEmail() === thread.getMessages()[0].getFrom();
}

function getCurrentThreadCount() {
  const previousAlerts = [];
  let threadCount = 0;
  for (const thread of GmailApp.getInboxThreads()) {
    if (isOurOwnEmailAlert(thread)) {
      previousAlerts.push(thread);
    } else {
      threadCount++;
    }
  }
  return [threadCount, previousAlerts]
}

function getLastThreadCounts(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }
  const howManyToRetrieve = 10;
  const range = sheet.getRange(
    Math.max(lastRow - howManyToRetrieve + 1, 1),
    2,
    lastRow > howManyToRetrieve ? howManyToRetrieve : lastRow,
    1);
  return range.getValues().map(x => x[0]);
}

function getLastThreadCount(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 0; // Default to 0 if no previous data exists
  }
  return sheet.getRange(lastRow, 2).getValue();
}

function saveThreadCount(sheet, count) {
  const lastRow = sheet.getLastRow();
  const newRow = lastRow + 1;
  const timeStamp = new Date();

  sheet.getRange(newRow, 1).setValue(timeStamp);
  sheet.getRange(newRow, 2).setValue(count);
}

const EMAIL_SUBJECT_PREFIX = "Inbox Thread Count Alert"
function emailSubject(lastCount, currentCount) {
  return `${EMAIL_SUBJECT_PREFIX}: ${currentCount - lastCount}`;
}

function sendAlertEmail(currentCount, lastCount) {
  const emailAddress = Session.getActiveUser().getEmail();
  const body = `Your Gmail inbox thread count has grown significantly from ${lastCount} to ${currentCount}. Please take control of your inbox and archive or snooze more emails.`;
  
  GmailApp.sendEmail(emailAddress, emailSubject(lastCount, currentCount), body);
}

function initializeSheet(sheet) {
  sheet.getRange(1, 1).setValue('Time');
  sheet.getRange(1, 2).setValue('Thread Count');
}
