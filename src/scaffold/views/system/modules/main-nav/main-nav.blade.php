{{-- -----------------------------------
  -- module: main-nav
  -- -----------------------------------
  --}}

<nav class="main-nav">
	@for ($i = 1; $i <= 5; $i++)
		<a class="main-nav__link" href="#">Link {{ $i }}</a>
	@endfor
</nav>
