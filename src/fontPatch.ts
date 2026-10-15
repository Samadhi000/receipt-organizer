import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { type } from './theme/theme';

// ---------------------------------------------------------------------------
// Apply the Inter font family globally, mapping each text's fontWeight to the
// matching Inter weight (so we get real Inter Bold/SemiBold, not synthetic
// bold). We patch Text/TextInput render once. Any text that sets its own
// fontFamily (e.g. icon fonts) is left untouched.
// ---------------------------------------------------------------------------

const weightMap: Record<string, string> = {
  '100': type.regular,
  '200': type.regular,
  '300': type.regular,
  '400': type.regular,
  normal: type.regular,
  '500': type.medium,
  '600': type.semibold,
  '700': type.bold,
  bold: type.bold,
  '800': type.extrabold,
  '900': type.extrabold,
};

function patch(Comp: any) {
  if (!Comp || Comp.__interPatched) return;
  const orig = Comp.render;
  if (typeof orig !== 'function') return;
  Comp.render = function (...args: any[]) {
    const el = orig.apply(this, args);
    const flat = (StyleSheet.flatten(el?.props?.style) || {}) as any;
    const family = flat.fontFamily || weightMap[String(flat.fontWeight ?? 'normal')] || type.regular;
    return React.cloneElement(el, {
      style: [el.props?.style, { fontFamily: family, fontWeight: undefined }],
    });
  };
  Comp.__interPatched = true;
}

patch(Text);
patch(TextInput);
