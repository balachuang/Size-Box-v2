var isGoogleDriveAvailable = undefined;
var catChanged = false;
var objectDB = null;
var targetObj = null;
var currMaxHeight = 0;
var containterHeight = 0;
var globalLeftPadding = 0;

$(document).ready(initDocument);

function initDocument()
{
    checkGoogle();

    $(window).resize(resizeContainers);
	containterHeight = $('#object-container').height();

    $(document).on('mouseleave', '#obj-selector', function(){ $('#obj-selector').hide(); });
    $(document).on('mouseleave', '#cat-selector', hideCategorySelector);

    $('#add-object').click(addObject);
    $('#change-category').click(showCategorSelectory);
    $(document).on('click', 'span.cat-option', checkCategory);
    $(document).on('click', 'span.obj-option', updateObject);
    $(document).on('click', '.object-delete', delObject);
    $(document).on('click', '.object-change', showObjectSelector);
    $(document).on('click', '.object-left', prevImage);
    $(document).on('click', '.object-right', nextImage);

    $(document).on('change', '.cat-check', function(){ catChanged = true; });

    $('#object-container').mousewheel(function(event, delta) {
		globalLeftPadding = Math.min(0, globalLeftPadding + delta * 10);
		$('#object-progress-bar').css({'margin-left' : globalLeftPadding});
        event.preventDefault();
    });
}

function checkGoogle()
{
    var img = $('#network-tester').get()[0];
    if (!img.complete) return setTimeout(checkGoogle, 1000);

    if (img.naturalWidth === 0) isGoogleDriveAvailable = false;
    else                        isGoogleDriveAvailable = true;

    prepareObjectsAndSelector();
}

// resize all contains and objects
function resizeContainers()
{
	containterHeight = $('#object-container').height();
    resizeObjects();
}

// resizing and relocation all objects.
// recursively call resizeObject to perform animation
function resizeObjects()
{
	$('#object-container .object').each(function(){ resizeObject($(this)); });
}

// resize single object.
// if the new obect is the meightest object, resize all other objects.
function resizeObject(thisObj)
{
	var maxChanged = false;

	if (thisObj.find('img.wait').length > 0) {
		//thisObj.find('.object-image').css({'margin-top' : containterHeight - 64});
		thisObj.width(thisObj.find('.object-image').width());
		thisObj.height(thisObj.find('.object-image').height());
		thisObj.css({'margin-top' : containterHeight - 64});
	}else{
		var h = eval(thisObj.attr('obj-height'));
		if (currMaxHeight < h) {
			currMaxHeight = h;
			maxChanged = true;
		}

		var thisHeight = h * containterHeight / currMaxHeight;
		var actImg = thisObj.find('.object-image.active');
		actImg.animate({'height' : thisHeight}, 100, function(){
			thisObj.width(actImg.width());
			thisObj.height(actImg.height());
			thisObj.css({'margin-top' : containterHeight - thisHeight});
		});
	}

	if (maxChanged) resizeObjects();
}

// add a new object
function addObject()
{
    $('#add-object').before(
        '<div class="object" name="中年帥氣男" obj-height="1.785">' + 
        '   <div class="object-mark"><img src="images/mark.png"></div>' +
        '   <a href="javascript:void(0)" target="_new">' +
        '       <img class="object-image wait" src="images/wait.gif" >' +
        '       <img class="object-image load" onload="preloadImageReady(this)" >' +
        '   </a>' +
        '   <div class="img-prepare">' +
        '       <img src="images/me1.png" class="current">' +
        '       <img src="images/me2.png">' +
        '   </div>' +
        '   <div class="object-info object-name">中年帥氣男</div>' +
        '   <div class="object-info object-delete">&#215;</div>' +
        '   <div class="object-info object-change">c</div>' +
        '   <div class="object-info object-left"  >l</div>' +
        '   <div class="object-info object-right" >r</div>' +
        '</div>'
    );

	resizeObjects();

	// preload imgage
	preLoadImage($('#add-object').prev('div.object'));
}

// pre-load image in a hide img object and display it after aload
function preLoadImage(thisObj)
{
	var imgurl = thisObj.find('img.current').attr('src');
	var prelod = thisObj.find('img.object-image.load');
	prelod.attr('src', imgurl);
}
function preloadImageReady(thisImg) {
	var wait = $(thisImg).prev('img.object-image.wait');
	wait.fadeOut(100, function(){
		wait.attr('src', $(thisImg).attr('src'));
		wait.removeClass('wait');
		wait.addClass('active');
		resizeObject(wait.closest('div.object'));
		wait.fadeIn(100);
	});
}

function addAllObjects()
{
    // remove myself
    $('div.object[name="中年帥氣男"]').remove();

    var allObjs = $('span.obj-option');
    $.each(allObjs, function(){
        var l = $('#add-object').position().left;
        var objid = $(this).attr('objid');
        var obj = readObjectInformation(objid);
    
        var imgs = null;
        var pref = null;
        if (isGoogleDriveAvailable)
        {
            imgs = obj.images.split(';');
            pref = 'https://docs.google.com/uc?id=';
        }else{
            imgs = obj.imageNames.split(';');
            pref = 'objImages/';
        }
        var imgHtml = '<img src="' + pref + $.trim(imgs[0]) + '" class="current">';
        for (var n=1; n<imgs.length; ++n) {
            imgHtml += '<img src="' + pref + $.trim(imgs[n]) + '">';
        }

        $('#add-object').before(
            '<div class="object" name="'+obj.name+'" obj-height="'+obj.height+'" >' + 
            '   <div class="object-mark"><img src="images/mark.png"></div>' +
			'   <a href="javascript:void(0)" target="_new">' +
			'       <img class="object-image wait" src="images/wait.gif" >' +
			'       <img class="object-image load" onload="preloadImageReady(this)" >' +
			'   </a>' +
			'   <div class="img-prepare">' + imgHtml + '</div>' +
			'   <div class="object-info object-name">' + obj.name + '</div>' +
			'   <div class="object-info object-delete">&#215;</div>' +
			'   <div class="object-info object-change">c</div>' +
			'   <div class="object-info object-left"  >l</div>' +
			'   <div class="object-info object-right" >r</div>' +
            '</div>'
        );

		resizeObjects();

		// preload imgage
		preLoadImage($('#add-object').prev('div.object'));
    });
}

// delete an object
function delObject()
{
	// reset max height
	var delObj = $(this).closest('div.object');
	var h = eval(delObj.attr('obj-height'));

    delObj.remove();
    $('#object-name-label').text('');

	if (h >= currMaxHeight) {
		currMaxHeight = 0;
		resizeObjects();
	}
}

// change the object contain
// call updateObject to re-render object
function showObjectSelector()
{
    // set targetObj for call back function
    targetObj = $(this).closest('div.object');

    // display selector
    if ($(this).offset().top + $('#obj-selector').height() >= $('#main-container').height() - 30)
    {
        $('#obj-selector').hide().css({
            top: $(this).offset().top - $('#obj-selector').height(),
            left: $(this).offset().left + 30
        }).show();
    }else{
        $('#obj-selector').hide().css({
            top: $(this).offset().top,
            left: $(this).offset().left + 30
        }).show();
    }
}

function updateObject()
{
    $('#obj-selector').hide();

    // read default object information
    var objid = $(this).attr('objid');
    var obj = readObjectInformation(objid);

    // visualize object
    targetObj.attr('obj-height', obj.height);
    targetObj.find('a').attr('href', 'https://www.google.com.tw/?gws_rd=ssl#safe=off&q=' + obj.name);
    targetObj.find('div.object-name').text(obj.name);

    var imgs = null;
    var pref = null;
    if (isGoogleDriveAvailable)
    {
        imgs = obj.images.split(';');
        pref = 'https://docs.google.com/uc?id=';
    }else{
        imgs = obj.imageNames.split(';');
        pref = 'objImages/';
    }

	var imgHtml = '<img src="' + pref + $.trim(imgs[0]) + '" class="current">';
    for (var n=1; n<imgs.length; ++n) {
        imgHtml += '<img src="' + pref + $.trim(imgs[n]) + '">';
    }
	targetObj.find('div.img-prepare').html(imgHtml);

	imgHtml =	'<img class="object-image wait" src="images/wait.gif" >' +
				'<img class="object-image load" onload="preloadImageReady(this)" >' ;
	targetObj.find('a').html(imgHtml);

	resizeObject(targetObj);

	// preload imgage
	preLoadImage(targetObj);
    targetObj = null;
}

// change image for multiple-image objects
function prevImage()
{
    changeImage($(this).closest('div.object'), false);
}
function nextImage()
{
    changeImage($(this).closest('div.object'), true);
}
function changeImage(thisObj, nxt)
{
	var curImg = thisObj.find('div.img-prepare').find('img.current');
	var nxtImg = nxt ? curImg.next('img') : curImg.prev('img');
	if (nxtImg.length == 1) {
		thisObj.find('img.object-image.active').attr('src', 'images/wait.gif').removeClass('active').addClass('wait');
		resizeObject(thisObj);

		curImg.removeClass('current');
		nxtImg.addClass('current');
		preLoadImage(thisObj);
	}
}

// return object information by index
function readObjectInformation(objid)
{
    var targetObjID = objid;
    if (targetObjID == null) {
        if ($('span.obj-option').length <= 0) return objectDB().first().get()[0];
        targetObjID = $('span.obj-option:eq(0)').attr('objid');
    }
    return objectDB(targetObjID).get()[0];
}

// show object information when mouse over
function showObjectInfo()
{
    // show object control icons
    var thisMark = $(this).find('.object-mark:visible');
    if (thisMark.length > 0)
    {
        // the object is too small, there is no need to enable the image change icons
        $(this).find('div.object-delete').css({
            top: thisMark.position().top + 25,
            left: thisMark.position().left - 2
        }).fadeIn(100);
        $(this).find('div.object-change').css({
            top: thisMark.position().top,
            left: thisMark.position().left - 2
        }).fadeIn(100);
    }else{
        // the object size is normal
        $(this).find('div.object-delete').css({
            top: 10,
            left: $(this).width() - 30
        }).fadeIn(100);
        $(this).find('div.object-change').css({
            top: 10,
            left: 10
        }).fadeIn(100);

        if ($(this).find('.object-image').length > 1)
        {
            var h = ($(this).find('.object-image.active').height() - $(this).find('div.object-left').height()) / 2;
            $(this).find('div.object-left').css({
                top: h,
                left: 10
            }).fadeIn(200);
            $(this).find('div.object-right').css({
                top: h,
                left: $(this).width() - $(this).find('div.object-right').width() - 10
            }).fadeIn(200);
        }
    }

    // show object name
    $('#object-name-label').text($(this).find('div.object-name').text());
    $('#object-name-label').css({
        left: Math.max(0, /*$('#y-axis').width() +*/ $(this).position().left + ( $(this).width() - $('#object-name-label').width()) / 2)
    });
}

function showCategorSelectory()
{
    $('#cat-selector').hide().css({
        top: $('#change-category').offset().top - $('#cat-selector').height(),
        left: $('#change-category').offset().left - $('#change-category').width() - 10
    }).show();
}

function checkCategory()
{
    catChanged = true;

    if ($(this).text().indexOf('全選') >= 0) return $('input.cat-check').prop('checked', true);
    if ($(this).text().indexOf('全不選') >= 0) return $('input.cat-check').prop('checked', false);

    var c = $(this).prev('input').prop('checked');
    $(this).prev('input').prop('checked', !c);
}

function hideCategorySelector()
{
    // if ($('input.cat-check:checked').length <= 0) $('input.cat-check:eq(0)').prop('checked', true);
    $('#cat-selector').hide();

    if (catChanged)
    {
        catChanged = false;
		currMaxHeight = 0;
        prepareObjSelector();
    }
}

// read all object information from properties file
// call prepareSelector to prepare selector for changeObject
function prepareObjectsAndSelector()
{
    // var userLang = navigator.language || navigator.userLanguage;
    $.get( "objects.csv", parsePropertyFile);

	// only for local test, remark this when deploy
	//var data =
	//	"Category,Name,Description,Height,Images,ImagesName,\n" +
	//	"人類,何平平,,0.73,0B9bJVD65eM1aR21Gck5jNmFtbE0,Pingping.png,\n" +
	//	"人類,史蒂芬·柯瑞,,1.91,0B9bJVD65eM1aVE5mQXZHc3NzcG8,Curry.png,\n" +
	//	"人類,姚明,,2.29,0B9bJVD65eM1aM01rOWdHVUdGWjA,Ming.png,\n" +
	//	"人類,羅伯特·潘興·瓦德羅,,2.72,0B9bJVD65eM1aMWdzdWZKREFOOG8,RobertWadlow.png,\n" +
	//	"交通工具,Honda CRV,,1.8,0B9bJVD65eM1aWXlCNktLQy1QUHM;0B9bJVD65eM1aOXlEbklEaThheFE,CRV_2.png;CRV_1.png,\n" +
	//	"交通工具,雙層巴士,,4.14,0B9bJVD65eM1aNFBDRzAwVEZpWTQ;0B9bJVD65eM1adVdUX0h0a1BtR00;0B9bJVD65eM1aeVVBdUV5bDVIRUE,double-bus-3.png;double-bus-1.png;double-bus-2.png," ;
	//parsePropertyFile(data);
}

function parsePropertyFile(data)
{
    var lines = data.split('\n');
    var colNum = $.trim(lines[0]).split(',').length;

    objectDB = TAFFY();
    var obj = null;

    // line 1 is only for human read
    for (var n=1; n<lines.length; ++n)
    {
        if ($.trim(lines[n]) == '') continue;
        if ($.trim(lines[n]).startsWith('#')) continue;

        var thisVals = $.trim(lines[n]).split(',');
        if (thisVals.length < colNum) {
            console.error('Wrong column number of this line: ' + lines[n]);
            continue;
        }

        // skip Descipriton, currently useless
        objectDB.insert({
            category: $.trim(thisVals[0]),
            name: $.trim(thisVals[1]),
            height: eval($.trim(thisVals[3])),
            images: $.trim(thisVals[4]),
            imageNames: $.trim(thisVals[5])
        });
    }

    prepareCatSelector();
    prepareObjSelector();
}

function prepareCatSelector()
{
    $('#cat-selector').remove();

    var catSelector = '<div id="cat-selector">';
    catSelector += '<div><span class="cat-option">[全選]</a></div>';
    catSelector += '<div><span class="cat-option">[全不選]</a></div>';
    $.each(objectDB().distinct('category'), function(k,v){
        catSelector += '<div><input type="checkbox" class="cat-check" value="' + v + '"> <span class="cat-option">' + v + '</span></div>';
    });
    catSelector += '</div>';
    $(catSelector).hide().appendTo('body').find('.cat-check:eq(0)').prop('checked', true);
}

function prepareObjSelector()
{
    // remove current objects
    $('.object:not(".control")').remove();
    $('#obj-selector').remove();

    var catFilterArray = new Array();
    $('input.cat-check:checked').each(function(){ catFilterArray.push($(this).val()); });

	var objSelector = '<div id="obj-selector">';
    objSelector += '<div><span onclick="javascript:addAllObjects();" style="cursor:pointer;">[加入全部]</span></div>';
    objectDB({category:catFilterArray}).order('height desc').each(function(r, rn){
		objSelector += '<div><span class="obj-option" objid="' + r.___id + '">[' + r.height + 'm] ' + r.name + '</span></div>';
    });
    objSelector += '</div>';
    $(objSelector).hide().appendTo('body');
}

// 'https://docs.google.com/uc?id='