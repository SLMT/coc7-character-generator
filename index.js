
$(document).ready(function() {
  initOccupationsSelect();
  initSkillList();
  registerCallbacks();
});

function initOccupationsSelect() {
  occupations.forEach(occupation => {
    $("#ch-occupation").append(`<option value="${occupation["name"]}">${occupation["nameCh"]}</option>`);
  });
}

function initSkillList() {
  var skillCount = skills.length;
  var skillCountPerCol = skillCount / 3;

  skills.forEach((skill, index) => {
    // 建立欄位字串
    var skillRow = `<tr id="skill-${skill["name"]}">
      <th>${skill["nameCh"]}</th>
      <td class="init-value">${skill["initValue"]}</td>
      <td></td>
      <td></td>
      <td>
        <table class="table align-middle table-bordered border-dark m-0">
          <tr>
            <td rowspan="2"></td>
            <td></td>
          </tr>
          <tr>
            <td></td>
          </tr>
        </table>
      </td>
    </tr>`;
    
    // 將欄位字串插入表格
    var colId = Math.floor(index / skillCountPerCol) + 1;
    var skillTableSelector = "#skill-row-body-" + colId;
    $(skillTableSelector).append(skillRow);
  });
}

function registerCallbacks() {
  $("#generate-attributes").click(generateAttributes);
  $("#occupation-characteristic").change(updateOccupationSkillPoints);
  $("#ch-occupation").change(onOccupationChange);
}

// 隨機生成屬性值與更新狀態
function generateAttributes() {
  var age = getAge();
  if (age == -1) {
    return;
  }

  generateAttributeBy3Random("str");
  generateAttributeBy3Random("con");
  generateAttributeBy2Random("siz");
  generateAttributeBy3Random("dex");
  generateAttributeBy3Random("app");
  generateAttributeBy2Random("int");
  generateAttributeBy3Random("pow");
  generateAttributeBy2Random("edu");

  var ageAdjustment = adjustDueToAge(age);
  adjustStatus(ageAdjustment["lukTimes"], ageAdjustment["movAdjust"]);
  updateSkillPoints();
}

function generateAttributeBy3Random(name) {
  var value = (randomInt(6) + randomInt(6) + randomInt(6)) * 5;
  changeAttributeValue(name, value);
}

function generateAttributeBy2Random(name) {
  var value = (randomInt(6) + randomInt(6) + 6) * 5;
  changeAttributeValue(name, value);
}

function changeAttributeValue(name, value) {
  var selectorName = "#attribute-" + name;
  $(selectorName + " .value-original").text(value);
  $(selectorName + " .value-hard").text(Math.floor(value / 2));
  $(selectorName + " .value-extreme").text(Math.floor(value / 5));
}

function randomInt(max) {
  return Math.floor(Math.random() * max) + 1;
}

function getAge() {
  var ageStr = $("#ch-age").val();

  // 檢查年齡值是否正確填寫
  if (isNaN(parseInt(ageStr))) {
    $("#ch-age").addClass("is-invalid");
    return -1;
  }
  var age = parseInt(ageStr);
  if (age < 15 || age > 89) {
    $("#ch-age").addClass("is-invalid");
    return -1;
  }

  // 移除錯誤標籤
  $("#ch-age").removeClass("is-invalid");
  return age;
}

// 年齡調整
function adjustDueToAge(age) {
  var ageAdjustment = getAgeAdjustment(age);
  var logMsgs = [];

  // Debuf 調整
  for (var i = 0; i < ageAdjustment["debufs"].length; i++) {
    var debufInfo = ageAdjustment["debufs"][i];
    var debufLogs = ageDebuf(debufInfo["attributes"], debufInfo["value"]);
    logMsgs = logMsgs.concat(debufLogs);
  }

  // 教育增強檢定
  if (ageAdjustment["eduBufCheckTimes"] > 0) {
    var edeCheckLogs = ageEduBufCheck(ageAdjustment["eduBufCheckTimes"]);
    logMsgs = logMsgs.concat(edeCheckLogs);
  }

  // 顯示調整結果
  var finalLog = logMsgs.join("<br>");
  showAgeAdjustmentMsg(ageAdjustment, finalLog);

  return ageAdjustment;
}

function getAgeAdjustment(age) {
  for (var i = 0; i < ageAdjustments.length; i++) {
    if (age <= ageAdjustments[i]["max"]) {
      return ageAdjustments[i];
    }
  }
  alert("找不到對應年齡規則，請聯絡開發者");
}

function showAgeAdjustmentMsg(ageAdjustment, logMsg) {
  var rule = `${ageAdjustment["min"]} ~ ${ageAdjustment["max"]} 歲：${ageAdjustment["rule"]}`;
  $("#age-adjust-msg").removeAttr("hidden");
  $("#age-adjust-rule").text(rule);
  $("#age-adjust-log").html(logMsg);
}

// 根據年齡規則調整屬性值
function ageDebuf(attributeNames, totalValue) {
  var logMsgs = [];
  var MIN_VALUE = 15;

  // 先計算有多少數值可以減少
  var availableAmounts = {};
  var adjustAmounts = {};
  var totalAvailable = 0;
  for (var i = 0; i < attributeNames.length; i++) {
    var attrName = attributeNames[i]["en"];
    var attrValue = getAttributeValue(attrName);
    var availableAmount = attrValue - MIN_VALUE;
    availableAmounts[attrName] = availableAmount;
    adjustAmounts[attrName] = 0;
    totalAvailable += availableAmount;
  }

  // 如果剩餘數值根本不夠減，直接扣光光
  if (totalAvailable <= totalValue) {
    for (var i = 0; i < attributeNames.length; i++) {
      var attrName = attributeNames[i]["en"];
      adjustAmounts[attrName] = availableAmounts[attrName];
    }
  } else {
    // 決定各屬性數值減少量
    var attrIndex = 0;
    while (totalValue > 0) {
      var attrName = attributeNames[attrIndex]["en"];
      var adjustAmount = randomInt(availableAmounts[attrName]) - 1;

      if (adjustAmount > totalValue) {
        adjustAmount = totalValue;
      }

      availableAmounts[attrName] -= adjustAmount;
      adjustAmounts[attrName] += adjustAmount;
      totalValue -= adjustAmount;

      // 持續調整各屬性值直到所有值都分配完畢
      attrIndex = (attrIndex + 1) % attributeNames.length;
    }
  }

  for (var i = 0; i < attributeNames.length; i++) {
    var attrNameEn = attributeNames[i]["en"];
    var attrNameCh = attributeNames[i]["ch"];

    if (adjustAmounts[attrNameEn] > 0) {
      var logMsg = ageDebufOnAttribute(
        attrNameEn,
        attrNameCh,
        adjustAmounts[attrNameEn]
      );
      logMsgs.push(logMsg);
    }
    
  }

  return logMsgs;
}

function getAttributeValue(attributeName) {
  var selectorName = "#attribute-" + attributeName;
  var val = $(selectorName + " .value-original").text();
  return parseInt(val);
}

function ageDebufOnAttribute(attrNameEn, attrNameCh, amount) {
  var attrValue = getAttributeValue(attrNameEn);
  var attrNewValue = attrValue - amount;
  changeAttributeValue(attrNameEn, attrNewValue);
  return `${attrNameCh}： ${attrValue} - ${amount} = ${attrNewValue}`;
}

function ageEduBufCheck(times) {
  var eduValue = getAttributeValue("edu");
  var logMsgs = [];

  for (var i = 0; i < times; i++) {
    if (eduValue >= 99) {
      logMsgs.push(`教育值已達上限，不再進行教育增強檢定`);
      break;
    }

    var diceValue = randomInt(100);
    if (diceValue > eduValue) {
      var addValue = randomInt(10);
      var newEduValue = eduValue + addValue;

      if (newEduValue > 99) {
        newEduValue = 99;
        addValue = newEduValue - eduValue;
      }
      logMsgs.push(`教育增強檢定第 ${i + 1} 次：${diceValue} > ${eduValue}，成功，增加 ${addValue}，新教育值：${newEduValue}`);
      eduValue = newEduValue;
    } else {
      logMsgs.push(`教育增強檢定第 ${i + 1} 次：${diceValue} <= ${eduValue}，失敗，教育值不變`);
    }
  }

  changeAttributeValue("edu", eduValue);

  return logMsgs;
}

function adjustStatus(lukTimes, movAdjust) {
  // 調整 HP 值
  var sizVal = getAttributeValue("siz");
  var conVal = getAttributeValue("con");
  var hpMax = Math.floor((sizVal + conVal) / 10);
  $("#status-hp").text(hpMax);

  // 調整 MP 值
  var powVal = getAttributeValue("pow");
  var mpMax = Math.floor(powVal / 5);
  $("#status-mp").text(mpMax);

  // 調整 SAN 值
  var sanVal = powVal;
  $("#status-san").text(sanVal);

  // 調整幸運值
  var lukVal = 0;
  for (var i = 0; i < lukTimes; i++) {
    var rndVal = (randomInt(6) + randomInt(6) + randomInt(6)) * 5;
    if (rndVal > lukVal) {
      lukVal = rndVal;
    }
  }
  $("#status-luk").text(lukVal);

  // 調整移動速度
  var dexVal = getAttributeValue("dex");
  var strVal = getAttributeValue("str");
  var movVal = 0;
  if (dexVal < sizVal && strVal < sizVal) {
    movVal = 7;
  } else if (dexVal < sizVal || strVal < sizVal) {
    movVal = 8;
  } else {
    movVal = 9;
  }
  movVal -= movAdjust;
  $("#attribute-mov").text(movVal);

  // 決定傷害加成與體格
  var strSizVal = strVal + sizVal;
  var db = "-2";
  var build = -2;
  if (strSizVal <= 64) {
    db = "-2";
    build = -2;
  } else if (strSizVal <= 84) {
    db = "-1";
    build = -1;
  } else if (strSizVal <= 124) {
    db = "0";
    build = 0;
  } else if (strSizVal <= 164) {
    db = "1d4";
    build = 1;
  } else if (strSizVal <= 204) {
    db = "1d6";
    build = 2;
  } else {
    alert("計算 DB 與 Build 出錯，請聯絡開發者");
  }
  $("#status-db").text(db);
  $("#status-build").text(build);
}

function updateSkillPoints() {
  // 部分技能初始值是根據屬性值決定
  var eduVal = getAttributeValue("edu");
  var dexVal = getAttributeValue("dex");
  $("#skill-dodge .init-value").text(Math.floor(dexVal / 2));
  $("#skill-language-own .init-value").text(eduVal);

  // 決定技能點數
  updateOccupationSkillPoints();
  var intVal = getAttributeValue("int");
  $("#interest-skill-points").text(intVal * 2);
}

// 決定職業技能點數
function updateOccupationSkillPoints() {
  var chName = $("#occupation-characteristic").val();
  var chVal = getAttributeValue(chName);
  var eduVal = getAttributeValue("edu");
  $("#occupation-skill-points").text(eduVal * 2 + chVal * 2);
}

function onOccupationChange() {
  var occupationName = $("#ch-occupation").val();
  var occupation = findOccupation(occupationName);

  // 更新職業特徵
  var setSelected = false;
  $('#occupation-characteristic option').each(function() {
    if (occupation["skillChar"].includes($(this).val())) {
      $(this).prop("hidden", false);
      if (!setSelected) {
        $(this).prop("selected", true);
        setSelected = true;
      } else {
        $(this).prop("selected", false);
      }
    } else {
      $(this).prop("hidden", true);
      $(this).prop("selected", false);
    }
  });
}

function findOccupation(name) {
  for (var i = 0; i < occupations.length; i++) {
    if (occupations[i]["name"] == name) {
      return occupations[i];
    }
  }
}
