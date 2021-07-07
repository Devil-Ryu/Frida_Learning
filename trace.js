
var methodDepth = 0;  // 方法调用深度（即该方法是在嵌套调用的哪一层）


function trace(pattern) {
	// trace Java Class
	var found = false;
	Java.enumerateLoadedClasses({
		onMatch: function(aClass) {
			if (aClass.match(pattern)) {
				// console.warn("\n[*] Detect as Java Package.");
				var className = aClass.match(/[L]?(.*);?/)[1].replace(/\//g, ".");
				console.warn("\n[*] Find Class: " + className.toString());
				traceClass(className);
			}
		},
		onComplete: function() {}
	});
}


// hook所有类的方法
function traceClass(targetClass) {
	console.log("[*] Tracing Class: " + targetClass);
	// Java.user是新建一个对象
	var hook = Java.use(targetClass);
	// 利用反射方式，拿到当前类的所有方法
	var methods = hook.class.getDeclaredMethods();
	// 建完对象将对象释放掉
	hook.$dispose;
	// 将方法名保存到数组中
	var parseMethods = [];
	methods.forEach(function(method) {
		parseMethods.push(method.toString().replace(targetClass + '.', "TOKEN").match(/\sTOKEN(.*)\(/)[1]);
	});
	// 去掉一些重复的值
	var targets = uniqBy(parseMethods, JSON.stringify);
	// 对数组中所有的方法进行hook, traceMethod
	targets.forEach(function(targetMethod) {
		traceMethod(targetClass + "." + targetMethod);
	});
}

function traceMethod(targetClassMethod) {
	// var hook = Java.use(targetClassMethod);
	// 寻找最后一个.分隔符（用于把类名和方法名分开）
	var splitIndex = targetClassMethod.lastIndexOf(".");
	if (splitIndex == -1) return;

	// slice() 方法可提取字符串的某个部分，并以新的字符串返回被提取的部分
	var targetClass = targetClassMethod.slice(0, splitIndex);
	var targetMethod = targetClassMethod.slice(splitIndex + 1, targetClassMethod.length);

	// hook目标类
	var hook = Java.use(targetClass);
	// 重载的参数个数
	var overloadCount = hook[targetMethod].overloads.length;
	// 打印日志：追踪的方法有多少个重载参数
	console.log("[*] Tracing Method: " + targetClassMethod + " [" + overloadCount + " overload(s)]");

	// hook每一个重载
	for (var i = 0; i < overloadCount; i++) {
		hook[targetMethod].overloads[i].implementation = function() {
			// console.log(hook.class.getDeclaredMethod(targetClassMethod, hook));
			if (methodDepth == 0) console.log();  // 第一次进入函数的时候空一格，可以把函数块分割开，相对好看一点儿
			var enteredLog = "+ entered: " + targetClassMethod;  // 进入方法的log
			printContentWithPriex("warn", methodDepth, enteredLog);  // 打印log
			methodDepth++;  // 进入函数后函数调用深度加一，缩进加一

			// // 可以打印每个重载的调用栈，对调试有巨大的帮助，当然，信息也很多，尽量不要打印，除非分析陷入僵局
			// Java.perform(function() {
			// 	var bt = Java.use("android.util.log").getStackTraceString(Java.use("java.lang.Exception").$new());
			// });

			// 打印参数
			for (var j = 0; j < arguments.length; j++) {
				var argLog = "arg[" + j + "]: " + arguments[j];
				printContentWithPriex("log", methodDepth, argLog);  // 打印log
			}


			// 打印返回值
			var retval = this[targetMethod].apply(this, arguments);
			var retvalLog = "retval: " + retval;  // 返回参数的log
			printContentWithPriex("log", methodDepth, retvalLog);  // 打印log

			
			methodDepth--;  // 退出函数后函数调用深度减一，缩进减一

			var exitingLog = "- exiting: " + targetClassMethod;  // 退出方法的log
			printContentWithPriex("warn", methodDepth, exitingLog);  // 打印log
			return retval

		}
	}


}

// 从数组中去掉重复的值
function uniqBy(array, key)
{
        var seen = {};
        return array.filter(function(item) {
                var k = key(item);
                return seen.hasOwnProperty(k) ? false : (seen[k] = true);
        });
}

// 打印带前缀的内容
function printContentWithPriex(loglevel, depth, content) {
	var indent = "|   ";  // 填充符号
	eval("console." + loglevel + "('" + indent.repeat(depth) + content + "');" );
}


setTimeout(function() {
	Java.perform(function() {
		// traceClass("com.droider.sn.MainActivity");
		trace("com.droider.sn.MainActivity");
	})
})