{{-- -----------------------------------
  -- template: base
  -- -----------------------------------
  --}}

<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title>{{ config('app.name', 'Skeletor') }}</title>
		<link rel="stylesheet" type="text/css" href="{{ asset('css/styles.css') }}">
	</head>
	<body class="base">
		@include('global-header')
		@include('main-nav')
		@include('sub-nav')
		@yield('content')
		@include('global-footer')
		<script type="text/javascript" src="{{ asset('js/scripts.js') }}"></script>
	</body>
</html>
