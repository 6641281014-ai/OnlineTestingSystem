// Let's implement textbook-exact Regularized Incomplete Beta & Student t p-value

function logGamma(z) {
  const c = [
    57.1562356658629235, -59.5979603554754912, 14.1360979747417471,
    -0.491908960533037465, 0.339946499848118887e-4, 0.465236289270485756e-4,
    -0.983744753048795646e-4, 0.158088703224377344e-3, -0.210264441724104883e-3,
    0.217439618115212643e-3, -0.16431810653676389e-3, 0.844182239838527433e-4,
    -0.261908384015814087e-4, 0.368991826595316234e-5,
  ];
  let sum = 0.999999999999997092;
  const base = z + 4.65;
  for (let i = 0; i < c.length; i++) {
    sum += c[i] / (z + i + 1);
  }
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(base) - base + Math.log(sum);
}

function betacf(a, b, x) {
  const maxIter = 200;
  const eps = 3.0e-14;
  const qab = a + b;
  const qap = a + 1.0;
  const qam = a - 1.0;
  let c = 1.0;
  let d = 1.0 - (qab * x) / qap;
  if (Math.abs(d) < 1.0e-30) d = 1.0e-30;
  d = 1.0 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < 1.0e-30) d = 1.0e-30;
    c = 1.0 + aa / c;
    if (Math.abs(c) < 1.0e-30) c = 1.0e-30;
    d = 1.0 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < 1.0e-30) d = 1.0e-30;
    c = 1.0 + aa / c;
    if (Math.abs(c) < 1.0e-30) c = 1.0e-30;
    d = 1.0 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) <= eps) break;
  }
  return h;
}

function incbeta(a, b, x) {
  if (x <= 0.0) return 0.0;
  if (x >= 1.0) return 1.0;

  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1.0 - x));

  if (x < (a + 1.0) / (a + b + 2.0)) {
    return (bt * betacf(a, b, x)) / a;
  } else {
    return 1.0 - (bt * betacf(b, a, 1.0 - x)) / b;
  }
}

function studentT_pValue(t, df) {
  if (df <= 0) return 1.0;
  const absT = Math.abs(t);
  if (absT === 0) return 1.0;
  const x = df / (df + absT * absT);
  return incbeta(df / 2.0, 0.5, x);
}

console.log("t=2.5, df=9 -> p =", studentT_pValue(2.5, 9)); // expected ~ 0.0338
console.log("t=2.0, df=10 -> p =", studentT_pValue(2.0, 10)); // expected ~ 0.0734
console.log("t=3.0, df=20 -> p =", studentT_pValue(3.0, 20)); // expected ~ 0.0071
console.log("t=0.0, df=5 -> p =", studentT_pValue(0.0, 5)); // expected 1.0
